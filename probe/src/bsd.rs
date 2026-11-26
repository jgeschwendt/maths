//! the arithmetic invariants of E^D: D·Y² = x³ + 4x² + 4t⁶ over F5(t), with D squarefree and prime
//! to the bad places t, t²+3, t²+2t+3, t²+3t+3, and |Sha| from the refined BSD formula
//!
//! The formula, Ulmer, "On the Brauer–Siegel ratio for abelian varieties over function fields",
//! Algebra Number Theory 13 (2019), arXiv:1806.01961, §2.1 (BSD, item 3; parts 1 and 2 imply it,
//! cited there to Kato–Trihan):
//!
//!   L*(A) = Reg(A)·|Sha(A)| / H(A) · τ(A) / (q^{dim A·(g_C − 1)} · |A(K)_tor|·|Â(K)_tor|)
//!
//! with H(A) = q^{deg ω}, τ(A) = ∏_v c_v where c_v counts the components of the Néron fibre at v
//! defined over k_v, Reg built from the Néron–Tate height divided by log q, and
//! L*(A) = (log q)^{-r}/r! · d^r/ds^r L(A, s) at s = 1 (the leading coefficient in T = q^{-s}).
//! Here A = E is self-dual, q = 5, C = P¹ so g_C = 0, dim = 1:
//!
//!   |Sha|·Reg = L*·|tors|²·q^{deg ω − 1} / τ
use crate::ratio::Ratio;
use crate::*;

/// gcd
fn gcd(a: u64, b: u64) -> u64 {
    if b == 0 { a } else { gcd(b, a % b) }
}

/// a + b in F5[t]
fn padd(a: &[u8], b: &[u8]) -> Poly {
    trim(
        (0..a.len().max(b.len()))
            .map(|i| (a.get(i).unwrap_or(&0) + b.get(i).unwrap_or(&0)) % 5)
            .collect(),
    )
}

/// the roots of x³ + 4x² + 4t⁶ in F5[t]/v, v irreducible and prime to Σ (E has good reduction at v)
pub fn roots(v: &[u8]) -> u64 {
    let dv = v.len() - 1;
    let t6 = powmod(&[0, 1], 6, v);
    (0..5usize.pow(dv as u32))
        .filter(|&i| {
            let x = trim(digits(i, dv));
            let x2 = pdivrem(&pmul(&x, &x), v).1;
            let x3 = pdivrem(&pmul(&x2, &x), v).1;
            let sum = padd(&padd(&x3, &pmul(&[4], &x2)), &pmul(&[4], &t6));
            pdivrem(&sum, v).1.is_empty()
        })
        .count() as u64
}

/// ∏ c_v for E^D. At t = 0, E is I₆ split; D(0) a non-square makes it non-split, c = 6 or 2
/// (Ulmer, arXiv:1101.1939, 8.2 and 8.3 define split, the I_n values of c_v are Tate's table).
/// The three quadratic places are I₁, c = 1. At v | D, E good, the twist is I₀* and
/// c_v = 1 + #roots of E's reduced cubic in k_v. At ∞ E is good with reduced cubic X³ + 4, one
/// root in F5, so an odd deg D gives I₀* there with c = 2
pub fn tamagawa(d: &[u8]) -> u64 {
    let c0 = if place_class(d, &[0, 1]) == 'S' { 6 } else { 2 };
    let cinf = 1 + d.len().is_multiple_of(2) as u64;
    c0 * cinf * factor(d, 2).iter().map(|v| 1 + roots(v)).product::<u64>()
}

/// deg ω = Σ_v e(F_v)·deg v / 12 by Noether's formula, e(I_n) = n, e(I₀*) = 6: I₆ at t, I₁ at the
/// three quadratics (total degree 6), I₀* at the places of D (total degree deg D) and at ∞ when
/// deg D is odd
pub fn deg_omega(d: &[u8]) -> usize {
    let dg = d.len() - 1;
    (6 + 6 + 6 * dg + 6 * (dg % 2)) / 12
}

/// the part of #E^D(F_Q) common to every good fibre t₀ ∈ F_Q, Q = 5^k ≤ 5^kmax, with the factors
/// of 5 removed: E(K)_tor injects into each such E^D_{t₀}(F_Q) at the prime-to-5 part (Ulmer,
/// arXiv:1101.1939, Ex. 8.6), and has no 5-torsion because j(E) ∉ K⁵ (ibid. Prop. 7.3: a pole of
/// order 1 at each quadratic place)
pub fn torsion_bound(d: &[u8], kmax: u32) -> u64 {
    let mut g = (1..=kmax).fold(0, |g, k| {
        let e = ek(k);
        (0..e.f.q).fold(g, |g, t| {
            let chi = i64::from(e.f.chi[e.eval(d, t) as usize]);
            if e.bad(t) || chi == 0 {
                g
            } else {
                gcd(g, (e.f.q as i64 + 1 - chi * i64::from(e.at[t])) as u64)
            }
        })
    });
    while g % 5 == 0 {
        g /= 5;
    }
    g
}

/// |Sha|·Reg = L*·|tors|²·5^{deg ω − 1}/τ, divided by Reg
pub fn sha(lstar: Ratio, tors: u64, tau: u64, degw: usize, reg: Ratio) -> Ratio {
    let num = Ratio::new(
        i128::from(tors).pow(2) * 5i128.pow(degw as u32 - 1),
        i128::from(tau),
    );
    lstar * num / reg
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cubic_roots_at_places() {
        // t + 1: t = 4, 4t⁶ = 4, x³ + 4x² + 4 over F5: x = 1 gives 9 = 4, x = 2: 8+16+4 = 28 = 3,
        // x = 3: 27+36+4 = 67 = 2, x = 4: 64+64+4 = 132 = 2, x = 0: 4, none
        assert_eq!(roots(&[1, 1]), 0);
        // t + 2: t = 3, 4t⁶ = 1, x³ + 4x² + 1 has the root x = 2
        assert_eq!(roots(&[2, 1]), 1);
        // t²+t+1 is irreducible over F5 (disc −3 = 2); the count is a number of roots in F25
        assert!(roots(&[1, 1, 1]) <= 3);
    }

    #[test]
    fn tamagawa_cases() {
        // E itself: I₆ split, the rest good
        assert_eq!(tamagawa(&[1]), 6);
        // D(0) = 2 is a non-square: non-split I₆, c = 2
        assert_eq!(tamagawa(&[2]), 2);
        // odd degree adds c_∞ = 2 and the place of D adds 1 + roots
        assert_eq!(tamagawa(&[1, 1]), 6 * 2 * (1 + roots(&[1, 1])));
    }

    #[test]
    fn omega_degrees() {
        assert_eq!(deg_omega(&[1]), 1);
        assert_eq!(deg_omega(&[1, 1]), 2);
        assert_eq!(deg_omega(&[1, 0, 1]), 2);
        assert_eq!(deg_omega(&[1, 0, 0, 1]), 3);
    }

    #[test]
    fn torsion_of_e_and_the_formula() {
        assert_eq!(torsion_bound(&[1], 3), 1);
        // a rank-0 shape: L* = 24/5, tors 1, τ = 12, deg ω 2, Reg 1: 24/5 · 5/12 = 2
        let s = sha(Ratio::new(24, 5), 1, 12, 2, Ratio::new(1, 1));
        assert_eq!(s.to_string(), "2");
        assert_eq!(gcd(12, 18), 6);
        assert_eq!(padd(&[1, 2], &[4, 3, 1]), [0, 0, 1]);
    }
}
