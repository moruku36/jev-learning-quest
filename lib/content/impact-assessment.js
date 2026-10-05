'use strict';

const FOCUS_PUBLISHER = /\b(?:openai|anthropic|google(?: deepmind| cloud| ai)?)\b/i;
const SCALE_CLAIM = /\b(?:over\s+|more than\s+|about\s+|approximately\s+)?\d[\d,.]*(?:\s?(?:million|billion|thousand|[mkb]))?\s+(?:users?|customers?|developers?|engineers?|organizations?|devices?|downloads?|installs?|repositories|requests?|incidents?|breaches?|models?)\b/i;
const ADOPTION_SIGNAL = /\b(?:in production|production use|widely used|adopted by|deployed across|customer deployments?|scales?\s+(?:claude|to|across)|open-source project|downloads?)\b/i;
const OPERATIONAL_SIGNAL = /\b(?:actively exploited|exploited in the wild|in the wild|observed (?:attacks?|activity|incidents?)|threat campaign|security incident|data breach)\b/i;

function assessImpact(item, source = {}, assessedAt = new Date()) {
  const text = `${item.title || ''} ${item.summary || ''} ${item.focus || ''}`;
  const signals = [];
  let score = 0;
  const org = item.org || source.org || '';

  if (FOCUS_PUBLISHER.test(org)) {
    score += 18;
    signals.push({ type: 'requested_publisher_focus', evidence: org });
  }

  const scaleMatch = SCALE_CLAIM.exec(text);
  if (scaleMatch) {
    score += 30;
    signals.push({ type: 'explicit_scale_claim', evidence: scaleMatch[0].trim() });
  }

  if (ADOPTION_SIGNAL.test(text)) {
    score += 12;
    signals.push({ type: 'deployment_or_adoption_language' });
  }

  if (OPERATIONAL_SIGNAL.test(text)) {
    score += 15;
    signals.push({ type: 'observed_security_or_operational_effect' });
  }

  if (item.evidenceType) {
    score += 10;
    signals.push({ type: 'conference_research_signal', evidence: item.evidenceType });
  }

  const confidence = scaleMatch ? 'medium' : signals.length > 1 ? 'low-medium' : 'low';
  return {
    score,
    confidence,
    signals,
    evidenceUrl: item.url || null,
    assessedAt: assessedAt.toISOString(),
    communityMetrics: 'not_collected_from_source'
  };
}

function publisherGroup(org) {
  if (/openai/i.test(org || '')) return 'openai';
  if (/anthropic/i.test(org || '')) return 'anthropic';
  if (/google/i.test(org || '')) return 'google';
  if (/microsoft/i.test(org || '')) return 'microsoft';
  if (/aws/i.test(org || '')) return 'aws';
  if (/arxiv/i.test(org || '')) return 'arxiv';
  return String(org || 'unknown').toLowerCase();
}

module.exports = { assessImpact, publisherGroup };
