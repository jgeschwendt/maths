//! exact rationals on i128, reduced, denominator positive
use std::ops::{Div, Mul};

/// n/d in lowest terms
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Ratio {
    pub n: i128,
    pub d: i128,
}

fn gcd(a: i128, b: i128) -> i128 {
    if b == 0 { a.abs() } else { gcd(b, a % b) }
}

/// prime factorisation by trial division, smallest first
pub fn primes(mut n: i128) -> Vec<(i128, u32)> {
    let mut out = vec![];
    let mut p = 2;
    while p * p <= n {
        let mut e = 0;
        while n % p == 0 {
            n /= p;
            e += 1;
        }
        if e > 0 {
            out.push((p, e));
        }
        p += 1;
    }
    if n > 1 {
        out.push((n, 1));
    }
    out
}

impl Ratio {
    pub fn new(n: i128, d: i128) -> Self {
        let g = gcd(n, d) * d.signum();
        Ratio { n: n / g, d: d / g }
    }

    /// the integer n when d = 1
    pub fn integer(self) -> Option<i128> {
        (self.d == 1).then_some(self.n)
    }

    /// the integer square root when self is a perfect square
    pub fn root(self) -> Option<i128> {
        let n = self.integer()?;
        let r = (n.max(0) as f64).sqrt().round() as i128;
        (r * r == n).then_some(r)
    }

    /// 2^3·5^-2·7, or 0
    pub fn factored(self) -> String {
        if self.n == 0 {
            return "0".into();
        }
        let mut parts: Vec<(i128, i32)> = primes(self.n.abs())
            .into_iter()
            .map(|(p, e)| (p, e as i32))
            .chain(primes(self.d).into_iter().map(|(p, e)| (p, -(e as i32))))
            .collect();
        parts.sort();
        let sign = if self.n < 0 { "-" } else { "" };
        let body = parts
            .iter()
            .map(|&(p, e)| {
                if e == 1 {
                    p.to_string()
                } else {
                    format!("{p}^{e}")
                }
            })
            .collect::<Vec<_>>()
            .join("·");
        format!("{sign}{}", if body.is_empty() { "1".into() } else { body })
    }
}

impl Mul for Ratio {
    type Output = Ratio;

    fn mul(self, o: Ratio) -> Ratio {
        Ratio::new(self.n * o.n, self.d * o.d)
    }
}

impl Div for Ratio {
    type Output = Ratio;

    fn div(self, o: Ratio) -> Ratio {
        Ratio::new(self.n * o.d, self.d * o.n)
    }
}

impl std::fmt::Display for Ratio {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.d {
            1 => write!(f, "{}", self.n),
            _ => write!(f, "{}/{}", self.n, self.d),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reduces_and_multiplies() {
        let a = Ratio::new(6, -4);
        assert_eq!(a, Ratio::new(-3, 2));
        assert_eq!((a * Ratio::new(2, 3)).to_string(), "-1");
        assert_eq!((a / Ratio::new(3, 4)).to_string(), "-2");
        assert_eq!(Ratio::new(0, 7).to_string(), "0");
        assert_eq!(Ratio::new(-3, 2).to_string(), "-3/2");
    }

    #[test]
    fn squares_and_integers() {
        assert_eq!(Ratio::new(49, 1).root(), Some(7));
        assert_eq!(Ratio::new(48, 1).root(), None);
        assert_eq!(Ratio::new(-4, 1).root(), None);
        assert_eq!(Ratio::new(9, 2).root(), None);
        assert_eq!(Ratio::new(9, 3).integer(), Some(3));
        assert_eq!(Ratio::new(1, 3).integer(), None);
    }

    #[test]
    fn factors() {
        assert_eq!(primes(360), [(2, 3), (3, 2), (5, 1)]);
        assert_eq!(primes(97), [(97, 1)]);
        assert_eq!(Ratio::new(56, 25).factored(), "2^3·5^-2·7");
        assert_eq!(Ratio::new(-1, 1).factored(), "-1");
        assert_eq!(Ratio::new(0, 1).factored(), "0");
    }
}
