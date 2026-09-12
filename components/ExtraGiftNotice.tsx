'use client';
import { useEffect, useState } from 'react';
import { getDeviceId, getLocalParticipant } from '@/lib/client-api';
export function ExtraGiftNotice() {
  const [received,setReceived]=useState(false);
  useEffect(()=>{
    let active=true;
    const refresh=async()=>{const p=getLocalParticipant();if(!p||p.currentZone<3)return;try{const r=await fetch('/api/participants/extra-gift',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({participantId:p.id,deviceId:getDeviceId()})});if(r.ok){const data=await r.json();if(active)setReceived(data.received===true);}}catch{}};
    void refresh();const interval=setInterval(()=>{if(!document.hidden)void refresh();},15000);window.addEventListener('focus',refresh);return()=>{active=false;clearInterval(interval);window.removeEventListener('focus',refresh);};
  },[]);
  return received?<p className="extra-gift-notice" role="status">Bạn đã nhận phần thưởng đặc biệt</p>:null;
}
