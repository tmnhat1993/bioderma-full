'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { AlertTriangle, Check } from 'lucide-react';
import { BrandHeader } from './BrandHeader';
import { ArtButton } from './ArtButton';
import { getLocalParticipant, registerParticipant, verifyZone } from '@/lib/client-api';
import type { AgeRange, Gender, Participant } from '@/lib/types';

function ExperienceTitle() {
  return <div className="experience-title"><span>SÉBIUM</span><strong>REBALANCE LAB</strong></div>;
}

export function RegisterFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preview = searchParams.get('preview');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender | ''>('female');
  const [ageRange, setAgeRange] = useState<AgeRange | ''>('25-45');
  const [shareConsent, setShareConsent] = useState(true);
  const [consentRequested, setConsentRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [anonymousRequested, setAnonymousRequested] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ fullName: false, phone: false, gender: false, ageRange: false });
  const consentOpen = preview === 'consent' || consentRequested;
  const anonymousOpen = preview === 'anonymous' || anonymousRequested;

  useEffect(() => { if (preview) return; const current = getLocalParticipant(); if (current) router.replace(current.currentZone >= 3 ? '/completed' : `/zone/${Math.max(1,current.currentZone + 1)}`); }, [router, preview]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const nextErrors = {
      fullName: shareConsent && !fullName.trim(),
      phone: shareConsent && !/^(0|\+84)\d{9,10}$/.test(phone.replace(/[\s.-]/g, '')),
      gender: !gender,
      ageRange: !ageRange,
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) { setError('Vui lòng kiểm tra lại các thông tin được đánh dấu đỏ.'); return; }
    if (shareConsent) setConsentRequested(true); else setAnonymousRequested(true);
  };

  const confirmConsent = async (consent: boolean) => {
    if (!gender || !ageRange) return;
    setLoading(true); setError('');
    try { await registerParticipant({ consent, fullName, phone, gender, ageRange }); router.push(preview ? '/zone/1?preview=1' : '/zone/1'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể lưu thông tin.'); setConsentRequested(false); setAnonymousRequested(false); }
    finally { setLoading(false); }
  };

  return (
    <main className="app-shell">
      <section className="mobile-stage form-stage">
        <BrandHeader compact />
        <div className="form-card">
          <h1>THÔNG TIN KHÁCH HÀNG</h1>
          <form onSubmit={submit} noValidate>
            <div className="form-name-row">
              <label>Họ và tên<span aria-hidden="true">*</span><input className={fieldErrors.fullName ? 'input-invalid' : ''} aria-invalid={fieldErrors.fullName} value={fullName} onChange={(e) => { setFullName(e.target.value); setFieldErrors((current) => ({ ...current, fullName: false })); }} placeholder="NGUYỄN VĂN A" autoComplete="name" /></label>
              <label>Số điện thoại<input className={fieldErrors.phone ? 'input-invalid' : ''} aria-invalid={fieldErrors.phone} type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setFieldErrors((current) => ({ ...current, phone: false })); }} inputMode="tel" autoComplete="tel" /></label>
            </div>
            <div className={`form-choice-group gender-field${fieldErrors.gender ? ' field-invalid' : ''}`} role="group" aria-label="Giới tính"><p>Giới tính<span aria-hidden="true">*</span></p><div className="choice-row two"><label><input type="radio" name="gender" value="male" checked={gender==='male'} onChange={() => { setGender('male'); setFieldErrors((current) => ({ ...current, gender: false })); }} /> Nam</label><label><input type="radio" name="gender" value="female" checked={gender==='female'} onChange={() => { setGender('female'); setFieldErrors((current) => ({ ...current, gender: false })); }} /> Nữ</label></div></div>
            <fieldset className={fieldErrors.ageRange ? 'field-invalid' : ''}><legend>Độ tuổi<span aria-hidden="true">*</span></legend><div className="choice-row three">{([['18-24','18 - 24 TUỔI'],['25-45','25 - 45 TUỔI'],['45+','TRÊN 45 TUỔI']] as const).map(([value,label]) => <label key={value}><input type="radio" name="age" value={value} checked={ageRange===value} onChange={() => { setAgeRange(value); setFieldErrors((current) => ({ ...current, ageRange: false })); }} />{label}</label>)}</div></fieldset>
            <label className="consent-choice"><input type="checkbox" checked={shareConsent} onChange={(event) => { const checked = event.target.checked; setShareConsent(checked); if (!checked) setFieldErrors((current) => ({ ...current, fullName: false, phone: false })); }} /><span><Check size={13} /></span>Tôi đồng ý chia sẻ thông tin cá nhân để tham gia trải nghiệm chương trình.</label>
            <p className="privacy-note">Nếu không đồng ý chia sẻ thông tin, bạn vẫn có thể tham gia trải nghiệm và thông tin sẽ được lưu dưới dạng ẩn danh.</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <ArtButton asset="join" label="Tham gia trải nghiệm" className="submit-button" type="submit" />
          </form>
        </div>
        <div className="stage-art form-art" aria-hidden="true" />

        {consentOpen && <div className="modal-backdrop" role="presentation">
          <section className="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
            <h2 id="consent-title">QUY ĐỊNH<br />CHIA SẺ THÔNG TIN</h2>
            <p>Thông tin cá nhân được thu thập nhằm xác nhận người tham gia, tổng hợp kết quả khảo sát, liên hệ khi cần thiết về chương trình và chăm sóc khách hàng theo phạm vi bạn đã đồng ý.</p>
            <p>Thông tin có thể bao gồm họ tên, giới tính, độ tuổi, thời điểm tham gia và câu trả lời khảo sát. Nếu bạn không đồng ý chia sẻ thông tin, hệ thống chỉ lưu kết quả khảo sát dưới dạng ẩn danh.</p>
            <p>Dữ liệu được bảo mật, chỉ nhân sự hoặc đơn vị xử lý dữ liệu được ủy quyền mới được tiếp cận cho mục đích vận hành chương trình. Chúng tôi không bán hoặc chia sẻ thông tin cho bên thứ ba nếu không có sự đồng ý của bạn hoặc yêu cầu hợp pháp của cơ quan có thẩm quyền.</p>
            <p>Bạn có quyền yêu cầu kiểm tra, cập nhật, rút lại đồng ý hoặc xóa thông tin cá nhân theo quy định pháp luật Việt Nam về bảo vệ dữ liệu cá nhân.</p>
            <div className="modal-actions">
              <ArtButton asset="understood" label={loading ? 'Đang lưu...' : 'Đã hiểu'} disabled={loading} onClick={() => confirmConsent(true)} />
            </div>
          </section>
        </div>}
        {anonymousOpen && <div className="modal-backdrop"><section className="consent-modal anonymous-modal" role="dialog" aria-modal="true" aria-labelledby="anonymous-title"><Image src="/assets/event/lightning.webp" alt="" width={240} height={316} /><h2 id="anonymous-title">KHẢO SÁT ẨN DANH</h2><p>Thông tin cá nhân của bạn sẽ được hệ thống ghi nhận là khách hàng ẩn danh. Chúng tôi sẽ không lưu lại thông tin này trong hệ thống.</p><ArtButton asset="anonymous" label={loading ? 'Đang lưu...' : 'Đã hiểu & Tham gia trải nghiệm'} disabled={loading} onClick={() => confirmConsent(false)} /></section></div>}
      </section>
    </main>
  );
}

const zoneContent = {
  1: { title: 'BÍ KÍP CHĂM DA SẦU “MỤN”', text: <>Thao tác trên ipad và điền tên để sẵn sàng cùng <strong>BIODERMA</strong> gửi bí kíp đến hội chăm da sầu “mụn”</>, image: '/assets/event/zone-1-illu.webp', width: 1000, height: 563 },
  2: { title: 'KHOA HỌC DA SẦU “MỤN”', text: <>Nhận phiếu soi da và trải nghiệm soi da tư vấn chuyên sâu từ chuyên gia <strong>BIODERMA</strong>.</>, image: '/assets/event/zone-2-illu.webp', width: 1000, height: 667 },
  3: { title: 'GIẢI PHÁP DA SẦU “MỤN”', text: <>Tìm hiểu khoa học chăm da sầu “mụn” và công nghệ độc quyền Fluidactiv™.</>, image: '/assets/event/zone-3-illu.webp', width: 1000, height: 667 },
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

  const verifyCurrentCode = async (value: string) => {
    if (loading) return;
    setError('');
    if (!/^\d{4}$/.test(value)) { setError('Vui lòng nhập đúng 4 chữ số.'); return; }
    setLoading(true);
    try {
      const result = await verifyZone(zone, value); setParticipant(result.participant); setSuccess(true);
      if (result.rewardStatus === 'out_of_stock') setOutOfStock(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Không thể xác nhận mã.'); }
    finally { setLoading(false); }
  };

  const submitCode = (event: React.FormEvent) => {
    event.preventDefault();
    void verifyCurrentCode(code);
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
      <BrandHeader compact /><ExperienceTitle />
      <div className="zone-card">
        <h1>{content.title}</h1>
        <div className="zone-visual" aria-hidden="true"><Image src={content.image} alt="" width={content.width} height={content.height} sizes="(max-width: 480px) 88vw, 390px" /></div>
        <p>{content.text}</p>
        <div className="profile-pill">Mã của bạn: <strong>{participant?.publicCode || '...'}</strong></div>
        {!success ? <form className="code-form" onSubmit={submitCode}>
          <label htmlFor="zone-code">Nhập mã trạm</label>
          <input id="zone-code" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={code} onChange={(event) => {
            const value = event.target.value.replace(/\D/g, '').slice(0, 4);
            setCode(value); setError('');
            if (value.length === 4) void verifyCurrentCode(value);
          }} placeholder="" autoComplete="one-time-code" aria-describedby={error ? 'zone-code-error' : undefined} />
          {error && <p id="zone-code-error" className="form-error" role="alert">{error}</p>}
          <button className="visually-hidden" disabled={loading || code.length !== 4}>Xác nhận mã</button>
        </form> : <div className={`success-panel${sampleStatus === 'out_of_stock' ? ' out-of-stock' : ''}`} role="status"><span className="success-check" aria-hidden="true"><Check size={16} /></span><span>{sampleMessage}</span></div>}
      </div>
      <div className="zone-actions"><ArtButton asset="back" label="Quay lại" onClick={() => router.back()} /><ArtButton asset="next" label="Tiếp theo" disabled={!success} onClick={next} /></div>
      {outOfStock && <div className="modal-backdrop"><section className="consent-modal stock-modal" role="alertdialog" aria-modal="true"><AlertTriangle className="stock-icon" size={40} /><h2>SAMPLE ĐÃ HẾT</h2><p>Rất tiếc, sample tại Zone {zone} đã hết. Kết quả hoàn thành của bạn vẫn được ghi nhận và bạn có thể tiếp tục trải nghiệm.</p><ArtButton asset="understood" label="Đã hiểu" onClick={() => setOutOfStock(false)} /></section></div>}
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
