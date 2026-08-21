# HP IPISB-CH2 / W25Q32 sample

## Source

- Supplied filename: `IPISB-CH2-W25Q32_20170616_155538.BIN`
- Image size: `4,194,304` bytes (`0x400000`)
- SHA-256: `6d18c962f3ffa6b941ada4e6fa71be4cdf1e7ff8297f5f4a4b73e29969f350a9`
- Intended family: AMI Aptio IV
- Repository storage: metadata only; the firmware image is not committed.

The date embedded in the supplied filename appears to describe the dump. A firmware version string near the reset area contains `07/22/2011`.

## Intel flash layout

The image contains a valid Intel flash descriptor.

| Region | Start | End (exclusive) | Size |
|---|---:|---:|---:|
| Descriptor | `0x000000` | `0x001000` | `0x001000` |
| GbE | `0x001000` | `0x003000` | `0x002000` |
| Intel ME | `0x003000` | `0x200000` | `0x1FD000` |
| BIOS | `0x200000` | `0x400000` | `0x200000` |

## Firmware volumes

| Start | End | Size | Notes |
|---|---:|---:|---|
| `0x220000` | `0x230000` | `0x10000` | NVRAM volume; contains `AMITSESetup` and `SetupCpuFeatures` variables |
| `0x230000` | `0x240000` | `0x10000` | Redundant NVRAM volume |
| `0x240000` | `0x3A0000` | `0x160000` | Main DXE/application volume |
| `0x3A0000` | `0x400000` | `0x60000` | PEI/recovery/reset volume |

All four detected volume headers use filesystem GUID `7A9354D9-0468-444A-81CE-0BF617D890DF`.

## Relevant Aptio IV modules

| Module | File GUID | File range | Encapsulation |
|---|---|---:|---|
| Setup | `899407D7-99FE-43D8-9A21-79EC328CAC21` | `0x35E8E8-0x371E51` | DXE dependency plus compressed section |
| AMITSE | `B1DA0ADF-4F77-4070-A88E-BFFE1C60529A` | `0x31EE38-0x34E1E5` | Compressed section |

The image also contains the marker `SECURE_HP_SIGNATURE AB5 v07.09`. Any future rebuild must preserve the exact flash layout and account for HP integrity/signature behavior.

## Initial compatibility state

**Parse only**

The container, descriptor, volumes, NVRAM stores and relevant FFS modules can be identified. IFR and AMITSE data still need to be decompressed and compared with the current Aptio V parser before write support can be considered.

## Next analysis steps

1. Extract and decompress the Setup and AMITSE sections with a known Aptio IV-compatible UEFI extraction tool.
2. Generate verbose IFR from the exact decompressed Setup PE32 section.
3. Locate `setupdata` or the equivalent Aptio IV forms/navigation data.
4. Map Aptio IV opcode and access-level differences against the current editor.
5. Create sanitized structural fixtures; do not commit the vendor firmware image.
6. Verify that an unchanged extract/reinsert round trip preserves volume checksums, offsets and HP-specific integrity data.
