import struct,zlib
from pathlib import Path
p=Path('/tmp/verify-land')
def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
for i in [1,2]:
 w,h=640,100
 raw=b''.join(b'\0'+bytes([30 if i==1 else 150,80,150])*w for _ in range(h))
 (p/f'LAND-logo-{i}.png').write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
for i in [1,2]:
 parts=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
 text=f'BT /F1 24 Tf 50 700 Td (LAND proof {i}) Tj ET'.encode();parts.append(b'<< /Length '+str(len(text)).encode()+b' >>\nstream\n'+text+b'\nendstream')
 d=b'%PDF-1.4\n';offs=[0]
 for n,a in enumerate(parts,1):offs.append(len(d));d+=f'{n} 0 obj\n'.encode()+a+b'\nendobj\n'
 off=len(d);d+=b'xref\n0 6\n0000000000 65535 f \n'+b''.join(f'{o:010d} 00000 n \n'.encode() for o in offs[1:])+f'trailer << /Size 6 /Root 1 0 R >>\nstartxref\n{off}\n%%EOF'.encode();(p/f'LAND-proof-{i}.pdf').write_bytes(d)
