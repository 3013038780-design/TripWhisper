import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'TripWhisper · 欧洲旅行手账',description:'从出发前的期待，到每一天的从容。米兰与科莫湖旅行规划体验。'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="zh-CN"><body>{children}</body></html>}
