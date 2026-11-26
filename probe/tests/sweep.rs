use std::process::Command;

/// the binary on twists of degree ≤ 2: E, its |Sha|, the counts, and the TSV it writes
#[test]
fn small_sweep() {
    let out = std::env::temp_dir().join(format!("probe-sweep-{}.tsv", std::process::id()));
    let run = Command::new(env!("CARGO_BIN_EXE_probe"))
        .arg(&out)
        .arg("2")
        .output()
        .unwrap();
    let report = String::from_utf8(run.stdout).unwrap();
    assert!(run.status.success());
    for want in [
        "D tested (non-constant): 50",
        "admissible (a)(b): 17",
        "admissible with L(E^D,1/5) != 0: 16",
        "|Sha(E)| = 1",
        "contradictions: []",
    ] {
        assert!(report.contains(want), "{want} not in {report}");
    }
    let tsv = std::fs::read_to_string(&out).unwrap();
    std::fs::remove_file(&out).unwrap();
    assert_eq!(tsv.lines().count(), 53);
    let row = tsv.lines().find(|l| l.starts_with("2t+1\t")).unwrap();
    assert!(row.contains("\t24/5^1\t"));
}

/// no arguments: the defaults are the full sweep into ./twists.tsv, which only parses here
#[test]
fn bad_degree_is_rejected() {
    let run = Command::new(env!("CARGO_BIN_EXE_probe"))
        .arg("x.tsv")
        .arg("two")
        .output()
        .unwrap();
    assert!(!run.status.success());
}
