"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { achievementWinners, type AchievementResult } from "../../lib/achievement-results";
import { dateLabel, timeLabel } from "../editorial";
import { Icon } from "../ui";
import "./achievement-card.css";

export function AchievementCard({ result, category }: { result: AchievementResult; category?: string }) {
  const [flipped, setFlipped] = useState(false);
  const reducedMotion = useReducedMotion();
  const winners = achievementWinners(result.entries);

  return <article className="achievement-card" aria-label={result.eventTitle}>
    <div className="achievement-perspective">
      <motion.div
        className="achievement-rotor"
        initial={false}
        animate={{ rotateY: reducedMotion ? 0 : flipped ? 180 : 0 }}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 170, damping: 20 }}
        data-flipped={flipped}
      >
        <div className="achievement-face achievement-front" aria-hidden={flipped} inert={flipped}>
          <div className="achievement-top"><span className="icon-disc"><Icon name="trophy" /></span><span className="pill" data-status="published">Official · Published</span></div>
          <div className="achievement-event">{category && <span className="eyebrow">{category}</span>}<h3>{result.eventTitle}</h3></div>
          <p className="achievement-date">Published<br /><time dateTime={new Date(result.publishedAt).toISOString()}>{dateLabel(result.publishedAt)} · {timeLabel(result.publishedAt)} IST</time></p>
          <span className="achievement-hint">Flip to reveal winners <span aria-hidden="true">↗</span></span>
        </div>
        <div className="achievement-face achievement-back" aria-hidden={!flipped} inert={!flipped}>
          <span className="eyebrow">Official winners</span>
          <h3>{result.eventTitle}</h3>
          {winners.length ? <ul className="achievement-winners">{winners.map((winner, index) => <li key={`${winner.schoolId}-${index}`}>
            <span className="achievement-place">{winner.placeLabel}{winner.tied ? " · Tied" : ""}</span>
            <strong>{winner.participantName || winner.schoolName}</strong>
            {winner.participantName && <span>{winner.schoolName}</span>}
            {winner.entryLabel && <span>{winner.entryLabel}</span>}
            {winner.points !== undefined && <span className="achievement-points">{winner.points} {winner.points === 1 ? "point" : "points"}</span>}
          </li>)}</ul> : <p className="muted">{result.entries.length ? "No podium placements published. View full results for official awards." : "Results awaited. Official winners will appear once published."}</p>}
          <span className="achievement-hint">Flip back <span aria-hidden="true">↶</span></span>
        </div>
      </motion.div>
      {/* A sibling button keeps semantic headings/lists outside a button.
          Native activation supports touch,
          Enter and Space without intercepting scrolling gestures. */}
      <button type="button" className="achievement-flip-control" aria-pressed={flipped}
        aria-label={`${flipped ? "Flip back to event information" : "Flip to reveal official winners"} for ${result.eventTitle}`}
        onClick={() => setFlipped(value => !value)} />
    </div>
  </article>;
}

export function AchievementCards({ results, categories }: { results: AchievementResult[]; categories?: { _id: string; name: string }[] }) {
  const names = new Map(categories?.map(category => [category._id, category.name]));
  return <div className="achievement-grid">{results.map(result => <AchievementCard key={result.eventId} result={result} category={names.get(result.categoryId)} />)}</div>;
}
