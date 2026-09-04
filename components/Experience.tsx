'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, ShieldCheck, X } from 'lucide-react';
import { BrandHeader } from './BrandHeader';
import { getLocalParticipant, registerParticipant, verifyZone } from '@/lib/client-api';
import type { AgeRange, Gender, Participant } from '@/lib/types';

function ExperienceTitle() {
  return <div className="experience-title"><span>SÉBIUM</span><strong>REBALANCE LAB</strong></div>;
}

function Progress({ current }: { current: number }) {
  return (
    <div className="progress" aria-label={`Tiến độ: zone ${current} trên 3`}>
      {[1,2,3].map((zone) => <span key={zone} className={zone <= current ? 'active' : ''}>{zone < current ? <Check size={12} /> : zone}</span>)}
    </div>
  );
}

export function RegisterFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preview = searchParams.get('preview');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [ageRange, setAgeRange] = useState<AgeRange | ''>('');
  const [consentRequested, setConsentRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [anonymousRequested, setAnonymousRequested] = useState(false);
  const consentOpen = preview === 'consent' || consentRequested;
  const anonymousOpen = preview === 'anonymous' || anonymousRequested;

  useEffect(() => { if (preview) return; const current = getLocalParticipant(); if (current) router.replace(current.currentZone >= 3 ? '/completed' : `/zone/${Math.max(1,current.currentZone + 1)}`); }, [router, preview]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!fullName.trim() || !gender || !ageRange) { setError('Vui lòng điền đầy đủ thông tin trước khi tiếp tục.'); return; }
    setConsentRequested(true);
  };

  const confirmConsent = async (consent: boolean) => {
    if (!gender || !ageRange) return;
    setLoading(true); setError('');
    try { await registerParticipant({ consent, fullName, gender, ageRange }); if (consent) router.push('/zone/1'); else { setConsentRequested(false); setAnonymousRequested(true); } }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu thông tin.'); setConsentRequested(false); }
    finally { setLoading(false); }
  };

  return (
    <main className="app-shell">
      <section className="mobile-stage form-stage">
        <BrandHeader compact />
        <ExperienceTitle />
        <div className="form-card">
          <h1>THÔNG TIN KHÁCH HÀNG</h1>
          <form onSubmit={submit} noValidate>
            <label>Họ và tên<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="NGUYỄN VĂN A" autoComplete="name" /></label>
            <fieldset><legend>Giới tính</legend><div className="choice-row two"><label><input type="radio" name="gender" value="male" checked={gender==='male'} onChange={() => setGender('male')} /> Nam</label><label><input type="radio" name="gender" value="female" checked={gender==='female'} onChange={() => setGender('female')} /> Nữ</label></div></fieldset>
            <fieldset><legend>Độ tuổi</legend><div className="choice-row three">{([['18-24','18 - 24 TUỔI'],['25-45','25 - 45 TUỔI'],['45+','TRÊN 45 TUỔI']] as const).map(([value,label]) => <label key={value}><input type="radio" name="age" value={value} checked={ageRange===value} onChange={() => setAgeRange(value)} />{label}</label>)}</div></fieldset>
            <p className="privacy-note"><ShieldCheck size={15} /> Thông tin của bạn được bảo vệ và chỉ lưu đầy đủ khi bạn đồng ý.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button submit-button" type="submit">Tham gia trải nghiệm <ChevronRight size={17} /></button>
          </form>
        </div>
        <div className="stage-art form-art" aria-hidden="true" />

        {consentOpen && <div className="modal-backdrop" role="presentation">
          <section className="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
            <button className="modal-close" type="button" aria-label="Đóng" onClick={() => preview ? router.replace('/register') : setConsentRequested(false)}><X size={18} /></button>
            <ShieldCheck className="modal-icon" size={34} />
            <h2 id="consent-title">QUY ĐỊNH<br />CHIA SẺ THÔNG TIN</h2>
            <p>Thông tin cá nhân được thu thập nhằm xác nhận người tham gia, tổng hợp kết quả khảo sát và phục vụ hoạt động chăm sóc khách hàng theo phạm vi bạn cho phép.</p>
            <p>Bạn có quyền không đồng ý chia sẻ thông tin đầy đủ và vẫn có thể tiếp tục trải nghiệm chương trình.</p>
            <div className="modal-actions">
              <button className="secondary-button" disabled={loading} onClick={() => confirmConsent(false)}>Không đồng ý</button>
              <button className="primary-button" disabled={loading} onClick={() => confirmConsent(true)}>{loading ? 'Đang lưu...' : 'Đồng ý'}</button>
            </div>
          </section>
        </div>}
        {anonymousOpen && <div className="modal-backdrop"><section className="consent-modal anonymous-modal" role="dialog" aria-modal="true" aria-labelledby="anonymous-title"><Image src="/assets/event/lightning.webp" alt="" width={240} height={316} /><h2 id="anonymous-title">KHẢO SÁT ẨN DANH</h2><p>Thông tin trả lời của bạn sẽ được ẩn danh. Hệ thống chỉ lưu mã người dùng, thời gian và giới tính.</p><button className="primary-button" onClick={() => router.push(preview ? '/zone/1?preview=1' : '/zone/1')}>Đã hiểu &amp; Tiếp tục</button></section></div>}
      </section>
    </main>
  );
}

const zoneContent = {
  1: { title: 'BÍ KÍP CHĂM DA SẦU “MỤN”', text: 'Thao tác trên iPad và điền tên để sẵn sàng cùng Bioderma gỡ rối cho làn da sầu “mụn”.', image: '/assets/event/zone-1-illu.webp', width: 1000, height: 563 },
  2: { title: 'BÍ KÍP CHĂM DA SẦU “MỤN”', text: 'Nhận phiếu soi da và trải nghiệm soi da, tư vấn chuyên sâu từ chuyên gia Bioderma.', image: '/assets/event/zone-2-illu.webp', width: 1000, height: 667 },
  3: { title: 'BÍ KÍP CHĂM DA SẦU “MỤN”', text: 'Tìm hiểu khoa học chăm da sầu “mụn” và công nghệ chuyên biệt của Bioderma.', image: '/assets/event/zone-3-illu.webp', width: 1000, height: 667 },
} as const;

export function ZoneFlow({ zone }: { zone: 1 | 2 | 3 }) {
  const router = useRouter(); const searchParams = useSearchParams(); const isPreview = searchParams.get('preview') === '1'; const isCompletedPreview = isPreview && searchParams.get('completed') === '1'; const content = zoneContent[zone];
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [code, setCode] = useState(''); const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); const [success, setSuccess] = useState(false);
  const [outOfStock, setOutOfStock] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current: Participant | null = isPreview ? { id:'preview', publicCode:'BDM-DEMO', eventDate:'2026-09-12', consent:true, fullName:'Khách xem trước', gender:'female', ageRange:'25-45', createdAt:new Date().toISOString(), currentZone:isCompletedPreview ? 3 : zone-1, zone2SampleStatus:isCompletedPreview ? 'received' : undefined, zone3SampleStatus:isCompletedPreview ? 'received' : undefined } : getLocalParticipant();
      if (!current) { router.replace('/register'); return; }
      if (current.currentZone < zone - 1) { router.replace(`/zone/${Math.max(1,current.currentZone + 1)}`); return; }
      if (current.currentZone >= zone) setSuccess(true);
      setParticipant(current);
    }, 0);
    return () => clearTimeout(timer);
  }, [router, zone, isPreview, isCompletedPreview]);

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!/^\d{4}$/.test(code)) { setError('Vui lòng nhập đúng 4 chữ số.'); return; }
    setLoading(true);
    try {
      const result = await verifyZone(zone, code); setParticipant(result.participant); setSuccess(true);
      if (result.rewardStatus === 'out_of_stock') setOutOfStock(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể xác nhận mã.'); }
    finally { setLoading(false); }
  };

  const next = () => router.push(zone === 3 ? '/completed' : `/zone/${zone + 1}`);
  const sampleStatus = zone === 2 ? participant?.zone2SampleStatus : zone === 3 ? participant?.zone3SampleStatus : undefined;
  const sampleMessage = zone === 1
    ? 'Đã hoàn thành'
    : sampleStatus === 'received'
      ? 'Đã hoàn thành & nhận sampling'
      : sampleStatus === 'out_of_stock'
        ? 'Đã hoàn thành · Sampling đã hết'
        : 'Đã hoàn thành';

  return (
    <main className="app-shell"><section className="mobile-stage zone-stage">
      <BrandHeader compact /><ExperienceTitle /><Progress current={success ? zone : zone - 1} />
      <div className="zone-card">
        <div className="zone-label">ZONE {zone}</div><h1>{content.title}</h1>
        <div className="zone-visual" aria-hidden="true"><Image src={content.image} alt="" width={content.width} height={content.height} sizes="(max-width: 480px) 88vw, 390px" /></div>
        <p>{content.text}</p>
        <div className="profile-pill">Mã của bạn: <strong>{participant?.publicCode || '...'}</strong></div>
        {!success ? <form className="code-form" onSubmit={submitCode}>
          <label htmlFor="zone-code">Nhập mã 4 số từ PG</label>
          <input id="zone-code" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="••••" autoComplete="one-time-code" />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button full-button" disabled={loading || code.length !== 4}>{loading ? 'Đang kiểm tra...' : 'Xác nhận mã'}</button>
        </form> : <div className={`success-panel${sampleStatus === 'out_of_stock' ? ' out-of-stock' : ''}`} role="status"><span className="success-check" aria-hidden="true"><Check size={16} /></span><span>{sampleMessage}</span></div>}
      </div>
      <div className="zone-actions"><button type="button" className="secondary-button" onClick={() => router.back()}><ChevronLeft size={16} /> Quay lại</button><button type="button" className="primary-button" disabled={!success} onClick={next}>Tiếp theo <ChevronRight size={16} /></button></div>
      {outOfStock && <div className="modal-backdrop"><section className="consent-modal stock-modal" role="alertdialog" aria-modal="true"><AlertTriangle className="stock-icon" size={40} /><h2>SAMPLE ĐÃ HẾT</h2><p>Rất tiếc, sample tại Zone {zone} đã hết. Kết quả hoàn thành của bạn vẫn được ghi nhận và bạn có thể tiếp tục trải nghiệm.</p><button className="primary-button" onClick={() => setOutOfStock(false)}>Đã hiểu</button></section></div>}
    </section></main>
  );
}

export function CompletedFlow() {
  const router = useRouter(); const isPreview = useSearchParams().get('preview') === '1'; const [ready, setReady] = useState(false);
  useEffect(() => { const timer=setTimeout(()=>{const current=isPreview?{id:'preview',publicCode:'BDM-DEMO',eventDate:'2026-09-12',consent:true,gender:'female' as const,createdAt:new Date().toISOString(),currentZone:3}:getLocalParticipant();if(!current){router.replace('/register');return;}if(current.currentZone < 3){router.replace(`/zone/${Math.max(1,current.currentZone + 1)}`);return;}setReady(true);},0);return()=>clearTimeout(timer); },[router,isPreview]);
  const reviewZone = (zone: 1 | 2 | 3) => router.push(`/zone/${zone}${isPreview ? '?preview=1&completed=1' : ''}`);
  if (!ready) return null;
  return <main className="app-shell"><section className="mobile-stage completed-stage"><BrandHeader compact /><ExperienceTitle /><div className="complete-card"><div className="complete-icon"><Image src="/assets/event/checked-illu.webp" alt="" width={480} height={346} priority /></div><h1>Chúc mừng bạn</h1><p>Đã hoàn thành trải nghiệm tại<br /><strong>SÉBIUM REBALANCE LAB</strong></p></div><div className="completed-review"><p>Quay lại các màn hình đã hoàn thành</p><div className="completed-zone-links">{([1,2,3] as const).map((zone) => <button type="button" className="secondary-button" key={zone} onClick={() => reviewZone(zone)}><Check size={14} /> Zone {zone}</button>)}</div></div><div className="stage-art complete-art" aria-hidden="true" /></section></main>;
}
