-- 고객 공개 온라인 예약을 "신청(오너 확정 대기)" 상태로 두기 위한 새 상태값.
-- ADD VALUE IF NOT EXISTS: Supabase 등에서 수동 선반영했어도 migrate deploy 가 충돌 없이 통과하도록.
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'requested';
