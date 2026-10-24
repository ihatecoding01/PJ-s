import json
from typing import Any

def keccak_256(data: bytes) -> bytes:
    """
    Standard Ethereum Keccak-256 implementation in pure Python.
    Permutation keccak-f[1600] with rate 1088 bits and padding 0x01 ... 0x80.
    Matches web3.keccak and ethers.keccak256.
    """
    RC = [
        0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000,
        0x000000000000808B, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
        0x000000000000008A, 0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
        0x000000008000808B, 0x800000000000008B, 0x8000000000008089, 0x8000000000008003,
        0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
        0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008
    ]
    ROTC = [
        [0, 36, 3, 41, 18],
        [1, 44, 10, 45, 2],
        [62, 6, 43, 15, 61],
        [28, 55, 25, 21, 56],
        [27, 20, 39, 8, 14]
    ]
    rate = 136  # 1088 bits / 8 bytes
    q = rate - (len(data) % rate)
    if q == 1:
        padded = data + b'\x81'
    elif q == 2:
        padded = data + b'\x01\x80'
    else:
        padded = data + b'\x01' + b'\x00' * (q - 2) + b'\x80'

    state = [[0] * 5 for _ in range(5)]
    def rol64(x, n):
        return ((x << (n % 64)) | (x >> (64 - (n % 64)))) & 0xFFFFFFFFFFFFFFFF

    for block_idx in range(0, len(padded), rate):
        block = padded[block_idx:block_idx + rate]
        for i in range(17):
            val = int.from_bytes(block[i * 8:(i + 1) * 8], 'little')
            x = i % 5
            y = i // 5
            state[x][y] ^= val

        # 24 rounds of Keccak-f[1600]
        for round_idx in range(24):
            # Theta
            C = [state[x][0] ^ state[x][1] ^ state[x][2] ^ state[x][3] ^ state[x][4] for x in range(5)]
            D = [C[(x - 1) % 5] ^ rol64(C[(x + 1) % 5], 1) for x in range(5)]
            for x in range(5):
                for y in range(5):
                    state[x][y] ^= D[x]

            # Rho and Pi
            B = [[0] * 5 for _ in range(5)]
            for x in range(5):
                for y in range(5):
                    B[y][(2 * x + 3 * y) % 5] = rol64(state[x][y], ROTC[x][y])

            # Chi
            for x in range(5):
                for y in range(5):
                    state[x][y] = (B[x][y] ^ ((~B[(x + 1) % 5][y]) & B[(x + 2) % 5][y])) & 0xFFFFFFFFFFFFFFFF

            # Iota
            state[0][0] ^= RC[round_idx]

    out = b''
    for i in range(4):
        x = i % 5
        y = i // 5
        out += state[x][y].to_bytes(8, 'little')
    return out

def canonical_json(data: Any) -> str:
    """
    Serializes an object into canonical JSON:
    Keys sorted recursively, no whitespace between keys and values.
    """
    return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False)

def canonical_hash(data: Any) -> str:
    """
    Computes keccak256(utf8(canonicalJSON)).
    Returns 0x-prefixed 64-char hex string.
    """
    if hasattr(data, "model_dump"):
        data = data.model_dump()
    elif hasattr(data, "dict"):
        data = data.dict()
    canon_str = canonical_json(data)
    canon_bytes = canon_str.encode('utf-8')
    return "0x" + keccak_256(canon_bytes).hex()
