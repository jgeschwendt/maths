//! the sweep: E and its quadratic twists D of degree ≤ max_deg, written as a TSV
use crate::bsd::*;
use crate::ratio::Ratio;
use crate::yz::*;
use crate::*;
use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::time::Instant;

struct Row {
    admissible: bool,
    constant: bool,
    d: Poly,
    iz: Option<Ratio>,
    line: String,
    order: usize,
    sha: Option<Ratio>,
    weight: (usize, usize),
}

const HEADER: &str = "D\tfactor_degrees\tplaces(t,Σ quadratics)\tinert\tadmissible_ab\tn\teps\tL_coeffs\torder_at_1/5\tL(1/5)\t4L(1/5)\tdeg_omega\ttamagawa\ttorsion\tsha\trho\tL_Ad_1\tI_Z\tI_Z_factors\tI_Y\n";

/// writes the TSV to `out` for D = 1, the constant 2 and every squarefree D of degree 1..=max_deg,
/// and returns the report
pub fn run(out: &std::path::Path, max_deg: usize) -> String {
    let sig = sigma();
    let mut ds: Vec<Poly> = vec![vec![1], vec![2]];
    ds.extend(twists().into_iter().filter(|d| d.len() <= max_deg + 1));
    let ns: Vec<usize> = ds.iter().map(|d| degree(d, &sig)).collect();
    let ms: Vec<u32> = ns.iter().map(|n| (n.div_ceil(2) + 1) as u32).collect();
    let mut s: Vec<Vec<i64>> = vec![vec![]; ds.len()];
    let mut report = String::new();
    for k in 1..=*ms.iter().max().unwrap() {
        let t0 = Instant::now();
        let e = ek(k);
        let col: Vec<(usize, i64)> = ds
            .par_iter()
            .enumerate()
            .filter(|(i, _)| ms[*i] >= k)
            .map(|(i, d)| (i, e.ck(d)))
            .collect();
        for (i, c) in col {
            s[i].push(c);
        }
        writeln!(
            report,
            "k={k} Q={} {:.2}s",
            e.f.q,
            t0.elapsed().as_secs_f64()
        )
        .unwrap();
    }
    let (_, ad) = adjoint();
    let l_ad1 = ad_at_one(&ad);
    let lstar_e = leading(&complete(&newton(&s[0]).unwrap(), 3, 2).unwrap().1);
    let mut failures = vec![];
    let rows: Vec<Row> = ds
        .iter()
        .enumerate()
        .map(|(i, d)| {
            let constant = d.len() == 1;
            let n = ns[i];
            let classes: Vec<char> = sig.iter().map(|p| place_class(d, p)).collect();
            let inert = classes.iter().filter(|&&c| c == 'I').count();
            let places = sig
                .iter()
                .zip(&classes)
                .map(|(p, c)| format!("{}:{c}", fmt(p)))
                .collect::<Vec<_>>()
                .join(";");
            let admissible = !constant && !classes.contains(&'R') && inert % 2 == 0;
            let degs = if constant {
                "const".to_string()
            } else {
                factor(d, 2)
                    .iter()
                    .map(|f| (f.len() - 1).to_string())
                    .collect::<Vec<_>>()
                    .join("+")
            };
            let (eps, b) = must(d, newton(&s[i]).and_then(|b| complete(&b, n, 2)));
            let order = vanishing(&b);
            let num = at_centre(&b);
            failures.extend((eps == -1 && num != 0).then_some(format!("{}: eps=-1, L != 0", fmt(d))));
            let is_e = *d == [1];
            let eligible = is_e || (admissible && order == 0);
            let mut shv = None;
            let mut iz = None;
            let extra = if eligible {
                let lstar = leading(&b);
                let (tors, tau, dw) = (torsion_bound(d, 4), tamagawa(d), deg_omega(d));
                let reg = Ratio::new(1, if is_e { 3 } else { 1 });
                let sh = sha(lstar, tors, tau, dw, reg);
                failures.extend(
                    sh.root().filter(|&r| r > 0).is_none().then_some(format!("{}: |Sha| = {sh}", fmt(d))),
                );
                shv = Some(sh);
                let tail = if is_e {
                    assert_eq!(order, R);
                    "-\t-\t-\t-\t-".to_string()
                } else {
                    let (z, y) = intersections(l_ad1, rho(d), lstar_e, lstar);
                    iz = Some(z);
                    format!("{}\t{l_ad1}\t{z}\t{}\t{y}", rho(d), z.factored())
                };
                format!("{dw}\t{tau}\t{tors}\t{sh}\t{tail}")
            } else {
                "-\t-\t-\t-\t-\t-\t-\t-\t-".to_string()
            };
            let coeffs = b.iter().map(i128::to_string).collect::<Vec<_>>().join(",");
            Row {
                admissible,
                constant,
                d: d.clone(),
                iz,
                line: format!(
                    "{}\t{degs}\t{places}\t{inert}\t{}\t{n}\t{eps}\t{coeffs}\t{order}\t{}\t{}\t{extra}",
                    fmt(d),
                    if admissible { "yes" } else { "no" },
                    rat(num, n as u32),
                    rat(4 * num, n as u32)
                ),
                order,
                sha: shv,
                weight: (d.len(), d.iter().filter(|&&c| c != 0).count()),
            }
        })
        .collect();
    let mut tsv = String::from(HEADER);
    for r in &rows {
        tsv.push_str(&r.line);
        tsv.push('\n');
    }
    std::fs::write(out, tsv).unwrap();

    let tw: Vec<&Row> = rows.iter().filter(|r| !r.constant).collect();
    let adm: Vec<&Row> = tw.iter().copied().filter(|r| r.admissible).collect();
    let nonvan: Vec<&Row> = adm.iter().copied().filter(|r| r.order == 0).collect();
    let mut dist: BTreeMap<i128, usize> = BTreeMap::new();
    for r in &nonvan {
        *dist.entry(r.sha.unwrap().n).or_default() += 1;
    }
    let mut simple = nonvan.clone();
    simple.sort_by_key(|r| r.weight);
    let e = &rows[0];
    writeln!(report, "D tested (non-constant): {}", tw.len()).unwrap();
    writeln!(report, "admissible (a)(b): {}", adm.len()).unwrap();
    writeln!(report, "admissible with L(E^D,1/5) != 0: {}", nonvan.len()).unwrap();
    writeln!(
        report,
        "admissible but vanishing at 1/5: {}",
        adm.len() - nonvan.len()
    )
    .unwrap();
    writeln!(report, "|Sha(E)| = {}", e.sha.unwrap()).unwrap();
    writeln!(report, "L(E, Ad, 1) = {l_ad1}").unwrap();
    writeln!(report, "|Sha| distribution: {dist:?}").unwrap();
    for r in simple.iter().take(5) {
        writeln!(report, "I(D) {} = {}", fmt(&r.d), r.iz.unwrap()).unwrap();
    }
    writeln!(report, "contradictions: {failures:?}").unwrap();
    report
}

/// L* at 1/5: L over (1 − 5T)^order, at T = 1/5
fn leading(b: &[i128]) -> Ratio {
    let rest = stripped(b).1;
    Ratio::new(at_centre(&rest), 5i128.pow(rest.len() as u32 - 1))
}

/// a failed functional equation or integrality check is a bug in the inputs: stop and name D
fn must<T>(d: &[u8], r: Result<T, String>) -> T {
    match r {
        Ok(v) => v,
        Err(m) => panic!("{}: {m}", fmt(d)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn must_passes_values_through() {
        assert_eq!(must(&[1], Ok(3)), 3);
    }

    #[test]
    #[should_panic(expected = "t+1: functional equation fails")]
    fn must_names_the_twist() {
        must::<()>(&[1, 1], Err("functional equation fails".into()));
    }
}
