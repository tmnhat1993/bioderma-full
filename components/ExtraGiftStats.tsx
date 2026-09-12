import { EXTRA_GIFTS } from '@/lib/extra-gifts';
import type { Participant } from '@/lib/types';
export function ExtraGiftStats({participants}:{participants:Participant[]}) {
  const total=participants.filter(p=>p.extraGift).length;
  return <section className="admin-panel extra-gift-stats"><div className="panel-heading"><div><h2>Quà Extra · {total} khách đã nhận</h2><p>{participants.filter(p=>p.currentZone>=3&&!p.extraGift).length} khách hoàn thành 3 Zone chưa nhận quà đặc biệt</p></div></div><div className="extra-gift-grid">{EXTRA_GIFTS.map(gift=><div key={gift}><span>{gift}</span><strong>{participants.filter(p=>p.extraGift?.gift===gift).length}</strong></div>)}</div></section>;
}
