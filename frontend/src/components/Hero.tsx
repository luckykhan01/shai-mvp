import React from "react";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero__glow hero__glow--1" />
      <div className="hero__glow hero__glow--2" />

      <div className="hero__content">
        <div className="hero__badge">Hackathon Case</div>
        <h1 className="hero__title">
          <span className="hero__team">COMPS</span> — Security Live Dashboard
        </h1>
        <p className="hero__subtitle">
          Мы — команда <strong>Comps</strong>. За 24 часа мы собрали прототип DevSecOps-ассистента: 
          <em> ingestion</em> логов, <em>нормализация</em>, <em>алертинг</em>, 
          и живой <em>Dashboard</em> с автообновлением и анализом угроз.
        </p>

        <ul className="hero__bullets">
          <li>🔷 Реальный поток событий и алертов с цветовой индикацией риска</li>
          <li>🔷 Фильтры по типу атаки и IP, быстрый просмотр raw-логов</li>
          <li>🔷 Мини-график <em>Alerts over time</em> для живой динамики</li>
        </ul>

        <div className="hero__cta">
          <a className="btn btn--neon" href="#dashboard">Открыть дашборд</a>
        </div>
      </div>
    </section>
  );
}
