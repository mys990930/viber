/// CLI tool to run the parser on a project and dump the graph as JSON.
/// Usage: cargo run --bin parse_project -- /path/to/project
use std::path::Path;

use viber_lib::domain::graph::builder::build_graph;
use viber_lib::infra::parser::ParserRegistry;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: parse_project <project_path>");
        std::process::exit(1);
    }

    let project_path = Path::new(&args[1]);
    if !project_path.is_dir() {
        eprintln!("Error: {} is not a directory", project_path.display());
        std::process::exit(1);
    }

    let registry = ParserRegistry::with_defaults();
    let graph = build_graph(project_path, &registry);

    println!("=== NODES ({}) ===", graph.nodes.len());
    for node in &graph.nodes {
        let path_str = node.path.as_ref().map(|p: &std::path::PathBuf| p.display().to_string()).unwrap_or_default();
        println!("  {:?}\t{}\t{}\t{}", node.node_type, node.id, node.label, path_str);
    }

    println!("\n=== EDGES ({}) ===", graph.edges.len());
    for edge in &graph.edges {
        println!("  {:?}\t{} -> {}\t({})", edge.kind, edge.source, edge.target, edge.id);
    }

    // Also dump as JSON for easy comparison
    let json = serde_json::json!({
        "nodes": graph.nodes.iter().map(|n| {
            serde_json::json!({
                "id": n.id,
                "type": format!("{:?}", n.node_type).to_lowercase(),
                "label": n.label,
                "path": n.path.as_ref().map(|p: &std::path::PathBuf| p.display().to_string()),
                "language": n.language,
            })
        }).collect::<Vec<_>>(),
        "edges": graph.edges.iter().map(|e| {
            serde_json::json!({
                "id": e.id,
                "source": e.source,
                "target": e.target,
                "kind": format!("{:?}", e.kind),
            })
        }).collect::<Vec<_>>(),
    });

    // Write JSON to file
    let out_path = project_path.join(".viber_graph_dump.json");
    std::fs::write(&out_path, serde_json::to_string_pretty(&json).unwrap()).unwrap();
    eprintln!("\nJSON written to: {}", out_path.display());
}
