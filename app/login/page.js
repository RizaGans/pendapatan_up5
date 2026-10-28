'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef(null);
  const loginAudio = useRef(null);

  useEffect(() => () => window.clearTimeout(typingTimer.current), []);

  function handleTyping(setValue) {
    return (event) => {
      setValue(event.target.value);
      setTyping(true);
      window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => setTyping(false), 700);
    };
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    if (!loginAudio.current) {
      loginAudio.current = new Audio('/sounds/sound.mp3');
      loginAudio.current.preload = 'auto';
    }
    loginAudio.current.currentTime = 0;
    void loginAudio.current.play().catch((cause) => {
      console.warn('Audio login tidak dapat diputar:', cause);
    });
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Login gagal.');
      window.location.assign('/');
    } catch (cause) {
      setError(cause.message || 'Tidak dapat menghubungi server.');
      setSubmitting(false);
    }
  }

  return (
    <main className={`auth-page pln-login ${typing ? 'is-typing' : ''}`}>
      <div id="loginAtmosphere" className="login-atmosphere" aria-hidden="true">
        <div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" />
        <svg className="growth-road" viewBox="0 0 900 650" preserveAspectRatio="xMidYMid meet">
          <defs><linearGradient id="road" x1="0" x2="1"><stop stopColor="#bde4ff"/><stop offset="1" stopColor="#f4fbff"/></linearGradient></defs>
          <path d="M-70 615 C130 350 180 630 350 445 S540 470 635 318 S750 225 790 125" fill="none" stroke="#0a2b51" strokeWidth="118" opacity=".44" />
          <path d="M-70 590 C130 325 180 605 350 420 S540 445 635 293 S750 225 790 125" fill="none" stroke="url(#road)" strokeWidth="84" strokeLinecap="round" />
          <path d="M748 109 826 12 Q830 7 832 14 L843 137 Q844 145 837 142Z" fill="#06254b" opacity=".35" transform="translate(8 12)" />
          <path d="M748 109 826 12 Q830 7 832 14 L843 137 Q844 145 837 142Z" fill="url(#road)" />
          <g className="growth-walkers" fill="#0b3158" stroke="#d9efff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <g transform="translate(104 426)"><circle cy="-28" r="6"/><path d="M0-21v19m0-13-9 9m9-8 9 7m-9 5-8 14m8-14 9 13"/></g>
            <g transform="translate(307 459)"><circle cy="-28" r="6"/><path d="M0-21v19m0-13-9 9m9-8 9 7m-9 5-8 14m8-14 9 13"/></g>
            <g transform="translate(510 370)"><circle cy="-28" r="6"/><path d="M0-21v19m0-13-9 9m9-8 9 7m-9 5-8 14m8-14 9 13"/></g>
            <g transform="translate(680 256)"><circle cy="-28" r="6"/><path d="M0-21v19m0-13-9 9m9-8 9 7m-9 5-8 14m8-14 9 13"/></g>
          </g>
        </svg>
        <svg className="login-electricity" viewBox="0 0 1440 900" preserveAspectRatio="none">
          <path className="electric-arc arc-top" d="M-20 180 118 128 95 103 252 62 284 82 365 40 343 22 466 8" />
          <path className="electric-arc arc-right" d="M1460 220 1364 264 1387 292 1290 331 1322 352 1228 398" />
          <path className="electric-arc arc-bottom" d="M-24 794 84 748 66 719 176 677 204 696 286 650" />
        </svg>
        <div className="coin-field">
          {Array.from({ length: 9 }, (_, i) => <Image key={i} src="/rp-coin.png" width={450} height={450} className="rupiah-coin" style={{ '--coin-i': i }} alt="" aria-hidden="true" priority={i < 2} />)}
        </div>
        <div className="login-lightning" />
      </div>

      <header id="loginBrand" className="auth-nav login-nav">
        <a className="auth-brand" href="#hero" aria-label="PLN UP5">
          <Image src="/pln-logo.png" width={48} height={48} alt="" priority />
          <span>PLN <b>UP5</b></span>
        </a>
        <span className="login-nav-label">Sistem Administrasi Keuangan</span>
      </header>

      <section id="hero" className="login-layout">
        <div className="login-intro">
          <p className="login-kicker">Sistem Administrasi</p>
          <h1><span className="login-heading-main">Keuangan</span><strong>PLN UP5</strong></h1>
          <p className="login-description">Mendukung pengelolaan keuangan yang transparan, akurat, dan efisien untuk kinerja PLN yang lebih baik.</p>
          <div className="login-assurance"><span className="assurance-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2.8 19 6v5.1c0 4.4-2.8 8.1-7 10.1-4.2-2-7-5.7-7-10.1V6l7-3.2Z"/><path d="m9 12 2 2 4-4"/></svg></span><span><b>Transparan &amp; Akuntabel</b><small>Data keuangan terkelola dengan baik untuk masa depan yang lebih baik.</small></span></div>
        </div>

        <section id="loginForm" className="auth-card login-card" aria-label="Form login administrator">
          <div className="login-card-top"><span className="auth-lock" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4.5" y="10" width="15" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg></span><span className="secure-tag"><i /> KONEKSI AMAN</span></div>
          <div className="auth-card-heading"><div><h2>Selamat datang</h2><p>Masuk untuk membuka dashboard UP5.</p></div></div>
          <form className="login-form" onSubmit={submit}>
            <label htmlFor="loginUsername">Username</label>
            <div className="login-input-wrap"><span className="input-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.3"/><path d="M5.5 20c.5-3.6 2.7-5.5 6.5-5.5s6 1.9 6.5 5.5"/></svg></span><input id="loginUsername" name="username" autoComplete="username" autoCapitalize="none" spellCheck="false" maxLength={64} required value={username} onChange={handleTyping(setUsername)} placeholder="Masukkan username" /></div>
            <label htmlFor="loginPassword">Password</label>
            <div className="auth-password-wrap login-input-wrap"><span className="input-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4.5" y="10" width="15" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span><input id="loginPassword" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" maxLength={256} required value={password} onChange={handleTyping(setPassword)} placeholder="Masukkan password" />
              <button className="auth-eye" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>{showPassword && <path d="m4 4 16 16"/>}</svg></button>
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="btn primary login-submit" type="submit" disabled={submitting}>{submitting ? 'Memeriksa…' : 'Masuk ke dashboard'}<span aria-hidden="true">↗</span></button>
          </form>
          <div className="login-divider"><span>atau</span></div>
          <p className="auth-secure-note"><span /> Akses terbatas untuk administrator.</p>
        </section>
      </section>

      <footer className="auth-footer login-footer"><p>© PLN UP5 <span>·</span> Sistem informasi pendapatan</p><p>Akurat <i /> Transparan <i /> Terpercaya</p></footer>
    </main>
  );
}
