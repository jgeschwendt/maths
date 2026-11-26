//! usage: probe <out.tsv> [max twist degree, default 4]
fn main() {
    let mut a = std::env::args().skip(1);
    let out = a.next().unwrap();
    let deg = a.next().map_or(4, |d| d.parse().unwrap());
    print!("{}", probe::sweep::run(std::path::Path::new(&out), deg));
}
