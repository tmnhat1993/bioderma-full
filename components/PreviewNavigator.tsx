'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Eye, X } from 'lucide-react';
import { useState } from 'react';

const screens = [
  { label: '01 · Chào mừng', href: '/' },
  { label: '02 · Thông tin', href: '/register?preview=form' },
  { label: '03 · Consent', href: '/register?preview=consent' },
  { label: '04 · Ẩn danh', href: '/register?preview=anonymous' },
  { label: '05 · Zone 1', href: '/zone/1?preview=1' },
  { label: '06 · Zone 2', href: '/zone/2?preview=1' },
  { label: '07 · Zone 3', href: '/zone/3?preview=1' },
  { label: '08 · Hoàn tất', href: '/completed?preview=1' },
  { label: 'CMS · Login', href: '/bio-admin-9x32/login' },
  { label: 'CMS · Dashboard', href: '/bio-admin-9x32' },
];

export function PreviewNavigator() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const current = `${pathname}${params.size ? `?${params.toString()}` : ''}`;

  return <aside className={`preview-navigator ${open ? 'open' : ''}`} aria-label="Điều hướng xem nhanh màn hình">
    <button className="preview-toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
      {open ? <X size={17}/> : <Eye size={17}/>}<span>{open ? 'Đóng' : 'Xem screens'}</span>
    </button>
    {open && <nav>{screens.map((screen) => <Link key={screen.href} className={current === screen.href ? 'active' : ''} href={screen.href} onClick={() => setOpen(false)}>{screen.label}</Link>)}</nav>}
  </aside>;
}
