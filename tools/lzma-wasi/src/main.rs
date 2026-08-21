use std::env;
use std::fs;

use efi_compress::{decompress, Compression};

fn main() {
    let arguments: Vec<String> = env::args().collect();
    if arguments.len() != 4 {
        eprintln!("usage: firmware-decompress input.bin output.bin lzma|standard");
        std::process::exit(2);
    }

    let input = fs::read(&arguments[1]).expect("cannot open compressed input");
    let output = match arguments[3].as_str() {
        "lzma" => decompress(&input, Compression::Lzma),
        "standard" => decompress(&input, Compression::Tiano)
            .or_else(|_| decompress(&input, Compression::EfiStandard)),
        _ => {
            eprintln!("unknown compression mode");
            std::process::exit(2);
        }
    }
    .expect("firmware decompression failed");
    fs::write(&arguments[2], output).expect("cannot write decompressed output");
}
