//! the self-intersection Yun–Zhang's identity predicts for E and F′ = F(√D)
//!
//! Yun–Zhang, "Shtukas and the Taylor expansion of L-functions (II)", Ann. of Math. 189 (2019),
//! arXiv:1712.08026, Theorem 1.2 (p. 4), with µ = µ′ so r₊ = r, r₋ = 0, Σ₋ = ∅, ε₋ = 1:
//!
//!   |ω_X|·q^{ρ/2−N} · ε₋(π⊗η) / (2(−log q)^r · L(π, Ad, 1)) · L^{(r₊,r₋)}_{F′/F}(π)
//!       = ⟨Z^µ_π(ξ), Z^µ_π(ξ)⟩_{Sht′^r_G(Σ;ξ)}                                          (1.7)
//!
//! and Corollary 1.4 (p. 4), for Y^µ_π the push-forward of Z^µ_π to Sht^r_G(Σ;ξ):
//!
//!   2^{r−1}·|ω_X|·q^{ρ/2−N} / ((−log q)^r · L(π, Ad, 1)) · L^{(r)}(π, ½)·L(π⊗η, ½) = ⟨Y, Y⟩
//!
//! where |ω_X| = q^{−(2g−2)}, ρ = deg R for R the ramification locus of F′/F, N = deg Σ,
//! L̂(π, s+½) = q^{(2g−2+N/2)s}·L(π, s+½), L̂(π⊗η, s+½) = q^{(2g−2+ρ+N/2)s}·L(π⊗η, s+½)
//! (§1.1.1), L^{(r₊,r₋)} = ∂^{r₊}_{s₁}∂^{r₋}_{s₂} of L̂(π, s₁+s₂+½)·L̂(π⊗η, s₁−s₂+½) at 0, and
//! r ≡ #(inert places of Σ) mod 2. L(π, Ad, s) is defined by Res_{s=1} L(π×π̃, s) = L(π, Ad, 1)·
//! Res_{s=1} ζ_F(s) (Yun–Zhang I, arXiv:1512.02683, §4.3, proof of Prop. 4.5), the Euler
//! product over every place.
//!
//! Here g = 0, q = 5, N = 7 (t and three quadratic places), L(π, s+½) = L(E, s+1). At ord = r the
//! normalising powers of q do not touch the r-th derivative, and d^r/ds^r L(E, s+1) at 0 is
//! r!·(log q)^r·L*(E) in the leading coefficient L* of arXiv:1806.01961 §2.1.
use crate::ratio::Ratio;
use crate::*;

/// the order of vanishing of L(E, s) at s = 1, which Σ-inert parity and r must match
pub const R: usize = 2;
/// deg Σ: the place t and the three places of degree 2
pub const N: u32 = 7;

/// L(π, Ad, s) = M(5^{-s−1}), M a polynomial in U, from H¹(P¹, j_*Ad): Ad = Sym²⊗det⁻¹ has trace
/// a²/Q − 1 on a good fibre of F_Q, 1/Q on a node (Frobenius on the inertia invariants of the
/// unipotent block is a²/Q = 1/Q, the local factor ζ_v(s+1) of a Steinberg place), so
/// S′_k = Σ_t a_t² − Q·#good fibres of P¹(F_Q), and M(U) = exp(Σ S′_k U^k/k), of degree
/// −χ = 3·5 − 7 = 8 by Grothendieck–Ogg–Shafarevich, with eigenvalues of weight 3
pub fn adjoint() -> (i128, Vec<i128>) {
    let s: Vec<i64> = (1..=6)
        .map(|k| {
            let e = ek(k);
            let q = e.f.q as i64;
            let good = (0..e.f.q).filter(|&t| !e.bad(t)).count() as i64 + 1;
            e.at.iter().map(|&a| i64::from(a).pow(2)).sum::<i64>() + i64::from(e.ainf).pow(2)
                - q * good
        })
        .collect();
    complete(&newton(&s).unwrap(), 8, 3).unwrap()
}

/// L(π, Ad, 1) = M(1/25)
pub fn ad_at_one(m: &[i128]) -> Ratio {
    let n = m.len() as u32 - 1;
    Ratio::new(
        m.iter()
            .enumerate()
            .map(|(i, &c)| c * 25i128.pow(n - i as u32))
            .sum(),
        25i128.pow(n),
    )
}

/// ρ = deg R: the places of D and ∞ when deg D is odd
pub fn rho(d: &[u8]) -> usize {
    let dg = d.len() - 1;
    dg + dg % 2
}

/// (⟨Z, Z⟩, ⟨Y, Y⟩) for the L(E^D, 1/5) = ld and the leading coefficient lstar of E at 1/5
pub fn intersections(l_ad1: Ratio, rho: usize, lstar: Ratio, ld: Ratio) -> (Ratio, Ratio) {
    let fact: i128 = (1..=R as i128).product();
    let z = Ratio::new(25 * fact, 2) / l_ad1
        * lstar
        * ld
        * Ratio::new(5i128.pow(rho as u32 / 2), 5i128.pow(N));
    (z, z * Ratio::new(1 << R, 1))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adjoint_is_a_degree_8_polynomial_with_a_positive_value_at_one() {
        let (eps, m) = adjoint();
        assert_eq!(m.len(), 9);
        assert!(ad_at_one(&m).n > 0);
        assert_eq!(m[8], eps * 5i128.pow(12) * m[0]);
        assert_eq!(ad_at_one(&[1, 25]).to_string(), "2");
    }

    #[test]
    fn ramification_degree_is_even() {
        assert_eq!(rho(&[1, 1]), 2);
        assert_eq!(rho(&[1, 0, 1]), 2);
        assert_eq!(rho(&[1, 0, 0, 1]), 4);
    }

    #[test]
    fn y_is_2_to_the_r_times_z() {
        let (z, y) = intersections(Ratio::new(10, 1), 2, Ratio::new(2, 1), Ratio::new(1, 1));
        // 25·2·2/(2·10) · 5^{1−7}
        assert_eq!(z, Ratio::new(5, 5i128.pow(6)));
        assert_eq!(y, z * Ratio::new(4, 1));
    }
}
