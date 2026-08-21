use std::env;
use std::fs::File;
use std::io::{BufReader, BufWriter};

fn main() {
    let arguments: Vec<String> = env::args().collect();
    if arguments.len() != 3 {
        eprintln!("usage: lzma-decompress input.lzma output.bin");
        std::process::exit(2);
    }

    let input = File::open(&arguments[1]).expect("cannot open LZMA input");
    let output = File::create(&arguments[2]).expect("cannot create decompressed output");
    lzma_rs::lzma_decompress(&mut BufReader::new(input), &mut BufWriter::new(output))
        .expect("LZMA decompression failed");
}
