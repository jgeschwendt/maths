//! exact L-polynomials of E: y² + xy = x³ − t⁶ over F5(t) and its quadratic twists, their BSD
//! invariants (`bsd`) and the Yun–Zhang prediction for the Heegner–Drinfeld self-intersection (`yz`)
use rayon::prelude::*;
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};

pub mod bsd;
pub mod ratio;
pub mod sweep;
pub mod yz;

/// coefficients low first, trailing zeros trimmed
pub type Poly = Vec<u8>;

const INV: [u8; 5] = [0, 1, 3, 2, 4];

// ─── F5[t] ──────────────────────────────────────────────────────────────────────────────────────

pub fn trim(mut a: Poly) -> Poly {
    while a.last() == Some(&0) {
        a.pop();
    }
    a
}

pub fn pmul(a: &[u8], b: &[u8]) -> Poly {
    if a.is_empty() || b.is_empty() {
        return vec![];
    }
    let mut c = vec![0u8; a.len() + b.len() - 1];
    for (i, &x) in a.iter().enumerate() {
        for (j, &y) in b.iter().enumerate() {
            c[i + j] = (c[i + j] + x * y) % 5;
        }
    }
    trim(c)
}

pub fn pdivrem(a: &[u8], b: &[u8]) -> (Poly, Poly) {
    let mut r = a.to_vec();
    let bl = b.len();
    if r.len() < bl {
        return (vec![], trim(r));
    }
    let inv = INV[b[bl - 1] as usize];
    let mut q = vec![0u8; r.len() - bl + 1];
    for i in (0..q.len()).rev() {
        let c = (r[i + bl - 1] * inv) % 5;
        q[i] = c;
        for (j, &bj) in b.iter().enumerate() {
            r[i + j] = (r[i + j] + 5 - (c * bj) % 5) % 5;
        }
    }
    (trim(q), trim(r))
}

pub fn pgcd(mut a: Poly, mut b: Poly) -> Poly {
    while !b.is_empty() {
        let r = pdivrem(&a, &b).1;
        a = b;
        b = r;
    }
    a
}

pub fn digits(mut n: usize, d: usize) -> Poly {
    (0..d)
        .map(|_| {
            let r = (n % 5) as u8;
            n /= 5;
            r
        })
        .collect()
}

/// irreducible factors with multiplicity, trial division by monic polys of degree ≤ `maxdeg`; the
/// remainder, if any, is irreducible when its degree is below 2·(maxdeg + 1)
pub fn factor(p: &[u8], maxdeg: usize) -> Vec<Poly> {
    let mut rest = p.to_vec();
    let mut out = vec![];
    for d in 1..=maxdeg {
        for low in 0..5usize.pow(d as u32) {
            let mut f = digits(low, d);
            f.push(1);
            while rest.len() >= f.len() {
                let (q, r) = pdivrem(&rest, &f);
                if !r.is_empty() {
                    break;
                }
                out.push(f.clone());
                rest = q;
            }
        }
    }
    if rest.len() > 1 {
        let inv = INV[rest[rest.len() - 1] as usize];
        out.push(rest.iter().map(|&c| (c * inv) % 5).collect());
    }
    out
}

/// the bad closed places: t, then the irreducible factors of 1 − 2t⁶
pub fn sigma() -> Vec<Poly> {
    let mut f = factor(&[1, 0, 0, 0, 0, 0, 3], 3);
    f.sort();
    let mut v = vec![vec![0, 1]];
    v.extend(f);
    v
}

pub fn powmod(r: &[u8], mut e: usize, m: &[u8]) -> Poly {
    let mut base = pdivrem(r, m).1;
    let mut acc = vec![1u8];
    while e > 0 {
        if e & 1 == 1 {
            acc = pdivrem(&pmul(&acc, &base), m).1;
        }
        base = pdivrem(&pmul(&base, &base), m).1;
        e >>= 1;
    }
    acc
}

/// 'R' if p | D, else 'S' or 'I' by whether D mod p is a square in F5[t]/p
pub fn place_class(d: &[u8], p: &[u8]) -> char {
    let r = pdivrem(d, p).1;
    if r.is_empty() {
        return 'R';
    }
    if powmod(&r, (5usize.pow(p.len() as u32 - 1) - 1) / 2, p) == [1] {
        'S'
    } else {
        'I'
    }
}

fn squarefree(p: &[u8]) -> bool {
    let d: Poly = trim(
        p.iter()
            .enumerate()
            .skip(1)
            .map(|(i, &c)| (i as u8 * c) % 5)
            .collect(),
    );
    pgcd(p.to_vec(), d).len() == 1
}

/// squarefree D of degree 1..=4 up to squares of constants (leading coefficient 1 or 2)
pub fn twists() -> Vec<Poly> {
    let mut v = vec![];
    for dg in 1..=4usize {
        for lead in [1u8, 2] {
            for low in 0..5usize.pow(dg as u32) {
                let mut p = digits(low, dg);
                p.push(lead);
                if squarefree(&p) {
                    v.push(p);
                }
            }
        }
    }
    v
}

/// degree of L(E^D): conductor degree − 4, where a place of Σ dividing D goes from exponent 1 to 2,
/// any other zero of D and an odd ∞ add 2 per degree
pub fn degree(d: &[u8], sig: &[Poly]) -> usize {
    let dg = d.len() - 1;
    let g: usize = sig
        .iter()
        .filter(|p| pdivrem(d, p).1.is_empty())
        .map(|p| p.len() - 1)
        .sum();
    3 + 2 * (dg + dg % 2) - g
}

// ─── F_{5^k} ────────────────────────────────────────────────────────────────────────────────────

static ADD: OnceLock<Vec<u16>> = OnceLock::new();

/// digit-wise sums mod 5 of every pair of 4-digit numbers
fn addtab() -> &'static [u16] {
    ADD.get_or_init(|| {
        let mut t = vec![0u16; 625 * 625];
        for x in 0..625usize {
            for y in 0..625usize {
                let (mut a, mut b, mut m, mut r) = (x, y, 1usize, 0usize);
                for _ in 0..4 {
                    r += ((a % 5 + b % 5) % 5) * m;
                    a /= 5;
                    b /= 5;
                    m *= 5;
                }
                t[x * 625 + y] = r as u16;
            }
        }
        t
    })
}

/// element addition: digits are independent mod 5, so the low 4 and the rest add separately
pub fn add(a: u32, b: u32) -> u32 {
    let t = addtab();
    let h = u32::from(t[((a / 625) * 625 + b / 625) as usize]);
    let l = u32::from(t[((a % 625) * 625 + b % 625) as usize]);
    h * 625 + l
}

pub struct Field {
    pub q: usize,
    exp: Vec<u32>,
    log: Vec<u32>,
    pub chi: Vec<i8>,
}

impl Field {
    /// α^k = tail for the first tail making α primitive; elements are base-5 numbers in powers of α
    pub fn new(k: u32) -> Self {
        let q = 5usize.pow(k);
        let top = 5u32.pow(k - 1);
        let mut tail = 0;
        loop {
            tail += 1;
            let mut tm = [0u32; 5];
            for d in 1..5 {
                tm[d] = add(tm[d - 1], tail);
            }
            let mut exp = Vec::with_capacity(2 * (q - 1));
            let mut v = 1u32;
            let mut ok = true;
            for i in 0..q - 1 {
                exp.push(v);
                v = add((v % top) * 5, tm[(v / top) as usize]);
                if v == 0 || (v == 1 && i + 2 < q) {
                    ok = false;
                    break;
                }
            }
            if ok && v == 1 {
                let copy = exp.clone();
                exp.extend(copy);
                let mut log = vec![0u32; q];
                for (i, &e) in exp.iter().take(q - 1).enumerate() {
                    log[e as usize] = i as u32;
                }
                let chi = (0..q)
                    .map(|a| {
                        if a == 0 {
                            0
                        } else {
                            1 - 2 * (log[a] & 1) as i8
                        }
                    })
                    .collect();
                return Field { q, exp, log, chi };
            }
        }
    }

    pub fn mul(&self, a: u32, b: u32) -> u32 {
        if a == 0 || b == 0 {
            0
        } else {
            self.exp[(self.log[a as usize] + self.log[b as usize]) as usize]
        }
    }

    fn pow(&self, a: u32, e: u32) -> u32 {
        if a == 0 {
            0
        } else {
            self.exp[((self.log[a as usize] as u64 * u64::from(e)) % (self.q as u64 - 1)) as usize]
        }
    }
}

// ─── fibre traces of E ──────────────────────────────────────────────────────────────────────────

pub struct Ek {
    pub f: Field,
    /// a_t of E at every finite t ∈ F_Q
    pub at: Vec<i32>,
    /// a at ∞: Y² = X³ + 4
    pub ainf: i32,
    /// mt[((d−1)·4 + i−1)·Q + t] = d·t^i
    mt: Vec<u32>,
}

impl Ek {
    pub fn new(k: u32) -> Self {
        let f = Field::new(k);
        let q = f.q;
        let tab = addtab();
        let (mut gh, mut gl) = (Vec::with_capacity(q), Vec::with_capacity(q));
        for x in 0..q as u32 {
            // x³ + 4x² = x²(x + 4)
            let g = f.mul(f.mul(x, x), add(x, 4));
            gh.push((g / 625) as usize);
            gl.push((g % 625) as usize);
        }
        let cs: Vec<u32> = (0..q as u32).map(|t| f.mul(4, f.pow(t, 6))).collect();
        let mut seen = vec![false; q];
        for &c in &cs {
            seen[c as usize] = true;
        }
        let list: Vec<usize> = (0..q).filter(|&c| seen[c]).collect();
        let traces: Vec<(usize, i32)> = list
            .par_iter()
            .map(|&c| {
                let (ch, cl) = (c / 625, c % 625);
                let lo: Vec<u32> = (0..625).map(|y| u32::from(tab[cl * 625 + y])).collect();
                let hi: Vec<u32> = (0..625)
                    .map(|y| u32::from(tab[ch * 625 + y]) * 625)
                    .collect();
                let mut s = 0i32;
                for (&h, &l) in gh.iter().zip(&gl) {
                    s += i32::from(f.chi[(hi[h] + lo[l]) as usize]);
                }
                (c, -s)
            })
            .collect();
        let mut atab = vec![0i32; q];
        for (c, a) in traces {
            atab[c] = a;
        }
        let at = cs.iter().map(|&c| atab[c as usize]).collect();
        let ainf = -(0..q as u32)
            .map(|x| i32::from(f.chi[add(f.pow(x, 3), 4) as usize]))
            .sum::<i32>();
        let mut mt = Vec::with_capacity(16 * q);
        for d in 1..=4u32 {
            for i in 1..=4u32 {
                mt.extend((0..q as u32).map(|t| f.mul(d, f.pow(t, i))));
            }
        }
        Ek { f, at, ainf, mt }
    }

    /// D(t) for t ∈ F_Q
    pub fn eval(&self, d: &[u8], t: usize) -> u32 {
        let mut v = u32::from(d[0]);
        for (i, &di) in d.iter().enumerate().skip(1) {
            if di != 0 {
                v = add(v, self.mt[((di as usize - 1) * 4 + i - 1) * self.f.q + t]);
            }
        }
        v
    }

    /// whether the fibre at t ∈ F_Q is singular: Δ = t⁶(1 − 2t⁶) vanishes, t = 0 or t⁶ = 3
    pub fn bad(&self, t: usize) -> bool {
        t == 0 || self.f.pow(t as u32, 6) == 3
    }

    /// c_k for E^D: Σ over P¹(F_Q) of χ(D(t))·a_t, ∞ weighed by χ(lead D) when deg D is even, else 0
    pub fn ck(&self, d: &[u8]) -> i64 {
        let mut s = 0i64;
        for t in 0..self.f.q {
            s += i64::from(self.f.chi[self.eval(d, t) as usize]) * i64::from(self.at[t]);
        }
        if d.len() % 2 == 1 {
            s += i64::from(self.f.chi[d[d.len() - 1] as usize]) * i64::from(self.ainf);
        }
        s
    }
}

static CACHE: OnceLock<Mutex<HashMap<u32, Arc<Ek>>>> = OnceLock::new();

pub fn ek(k: u32) -> Arc<Ek> {
    let mut m = CACHE.get_or_init(Default::default).lock().unwrap();
    m.entry(k).or_insert_with(|| Arc::new(Ek::new(k))).clone()
}

/// c_1 … c_kmax for E^D
pub fn sums(d: &[u8], kmax: u32) -> Vec<i64> {
    (1..=kmax).map(|k| ek(k).ck(d)).collect()
}

// ─── L-polynomials ──────────────────────────────────────────────────────────────────────────────

/// coefficients of exp(Σ s_k T^k / k) by Newton's identities
pub fn newton(s: &[i64]) -> Result<Vec<i128>, String> {
    let mut b = vec![1i128];
    for k in 1..=s.len() {
        let acc: i128 = (1..=k).map(|i| i128::from(s[i - 1]) * b[k - i]).sum();
        if acc % k as i128 != 0 {
            return Err(format!("Newton not integral at k={k}"));
        }
        b.push(acc / k as i128);
    }
    Ok(b)
}

/// ε and the whole degree-n polynomial from b_0..b_m via b_{n−j} = ε·5^{n−2j}·b_j
pub fn complete(b: &[i128], n: usize, w2: usize) -> Result<(i128, Vec<i128>), String> {
    let m = b.len() - 1;
    let ok = |e: i128| {
        (0..=n / 2)
            .filter(|&j| n - j <= m)
            .all(|j| b[n - j] == e * 5i128.pow((w2 * (n - 2 * j) / 2) as u32) * b[j])
    };
    let e = match (ok(1), ok(-1)) {
        (true, false) => 1,
        (false, true) => -1,
        (true, true) => return Err("epsilon ambiguous".into()),
        _ => return Err("functional equation fails".into()),
    };
    let full = (0..=n)
        .map(|i| {
            if i <= m {
                b[i]
            } else {
                e * 5i128.pow((w2 * (2 * i - n) / 2) as u32) * b[n - i]
            }
        })
        .collect();
    Ok((e, full))
}

/// order of vanishing at T = 1/5: how often (1 − 5T) divides
pub fn vanishing(b: &[i128]) -> usize {
    stripped(b).0
}

/// the order of vanishing at T = 1/5 and L divided by (1 − 5T) that often
pub fn stripped(b: &[i128]) -> (usize, Vec<i128>) {
    let mut b = b.to_vec();
    let mut order = 0;
    while b.len() > 1 {
        let mut c = vec![b[0]];
        for &bi in &b[1..b.len() - 1] {
            c.push(bi + 5 * c[c.len() - 1]);
        }
        if b[b.len() - 1] + 5 * c[c.len() - 1] != 0 {
            break;
        }
        b = c;
        order += 1;
    }
    (order, b)
}

/// L(1/5) = N / 5^n with N = Σ b_i·5^{n−i}
pub fn at_centre(b: &[i128]) -> i128 {
    let n = b.len() - 1;
    b.iter()
        .enumerate()
        .map(|(i, &c)| c * 5i128.pow((n - i) as u32))
        .sum()
}

/// N / 5^e reduced
pub fn rat(mut num: i128, mut e: u32) -> String {
    if num == 0 {
        return "0".into();
    }
    while e > 0 && num % 5 == 0 {
        num /= 5;
        e -= 1;
    }
    if e == 0 {
        num.to_string()
    } else {
        format!("{num}/5^{e}")
    }
}

pub fn fmt(d: &[u8]) -> String {
    let mut parts = vec![];
    for (i, &c) in d.iter().enumerate().rev() {
        if c == 0 {
            continue;
        }
        let mono = match i {
            0 => String::new(),
            1 => "t".into(),
            _ => format!("t^{i}"),
        };
        parts.push(match (c, i) {
            (1, 1..) => mono,
            (_, 0) => c.to_string(),
            _ => format!("{c}{mono}"),
        });
    }
    parts.join("+")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn l_of(d: &[u8], n: usize) -> Vec<i128> {
        let m = n.div_ceil(2) + 1;
        complete(&newton(&sums(d, m as u32)).unwrap(), n, 2)
            .unwrap()
            .1
    }

    #[test]
    fn known_l() {
        assert_eq!(newton(&sums(&[1], 3)).unwrap(), [1, -5, -25, 125]);
        assert_eq!(vanishing(&[1, -5, -25, 125]), 2);
    }

    #[test]
    fn sigma_is_a_point_and_three_quadratics() {
        let s = sigma();
        assert_eq!(s.iter().map(Vec::len).collect::<Vec<_>>(), [2, 3, 3, 3]);
        let prod = s[1..].iter().fold(vec![1u8], |a, f| pmul(&a, f));
        assert_eq!(pmul(&prod, &[3]), vec![1, 0, 0, 0, 0, 0, 3]);
    }

    #[test]
    fn factorisation_multiplies_back() {
        let p = [1u8, 0, 0, 0, 0, 0, 3];
        let f = factor(&p, 3);
        let prod = f.iter().fold(vec![1u8], |a, g| pmul(&a, g));
        // monic factors: the product is p / 3
        assert_eq!(pmul(&prod, &[3]), p.to_vec());
    }

    #[test]
    fn functional_equation_predicts_extra_coefficients() {
        // t + 1 is coprime to Σ: n = 7, fixed from b_0..b_5, checked against b_6, b_7 from c_6, c_7
        let d = [1u8, 1];
        assert_eq!(degree(&d, &sigma()), 7);
        let direct = newton(&sums(&d, 7)).unwrap();
        let (_, full) = complete(&direct[..6], 7, 2).unwrap();
        assert_eq!(full, direct);
    }

    #[test]
    fn constant_twist_vanishes_at_centre() {
        let l = l_of(&[2], 3);
        assert_eq!(l, [1, 5, -25, -125]);
        assert!(vanishing(&l) >= 1);
    }

    #[test]
    fn twist_count_and_formats() {
        assert_eq!(twists().len(), 2 * (5 + 20 + 100 + 500));
        assert_eq!(fmt(&[3, 2, 0, 1]), "t^3+2t+3");
        assert_eq!(rat(250, 4), "2/5^1");
        assert_eq!(place_class(&[2], &[0, 1]), 'I');
    }
}

#[cfg(test)]
mod more_tests {
    use super::*;

    #[test]
    fn errors_and_bad_fibres() {
        // s = [1, 0]: b₁ = 1, then 1/2 is not an integer
        assert!(newton(&[1, 0]).unwrap_err().contains("k=2"));
        // b₀ = 1, b₁ = 1: n = 2 gives b₂ = ±5²·b₀ at j = 0 and b₁ = ±5⁰·b₁ at j = 1
        assert_eq!(complete(&[1, 0, 25], 2, 2).unwrap().0, 1);
        assert_eq!(complete(&[1, 0, -25], 2, 2).unwrap().0, -1);
        assert!(complete(&[1, 0, 3], 2, 2).unwrap_err().contains("fails"));
        assert!(complete(&[0], 0, 2).unwrap_err().contains("ambiguous"));
        // bad fibres of F_25 and F_5: t = 0 only over F_5
        let e = ek(1);
        assert_eq!((0..5).filter(|&t| e.bad(t)).count(), 1);
        assert_eq!((0..25).filter(|&t| ek(2).bad(t)).count(), 7);
        // D = t at t = 3 is 3
        assert_eq!(e.eval(&[0, 1], 3), 3);
        assert_eq!(stripped(&[1, -5, -25, 125]), (2, vec![1, 5]));
        // an irreducible remainder, monic or not
        assert_eq!(factor(&[2, 0, 1], 1), [vec![2, 0, 1]]);
        assert_eq!(factor(&[4, 0, 2], 1), [vec![2, 0, 1]]);
        assert_eq!(rat(7, 0), "7");
    }
}
