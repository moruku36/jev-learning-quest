'use strict';

const fs = require('fs');
const path = require('path');

function getJstWeekKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const localDate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  const daysSinceMonday = (localDate.getUTCDay() + 6) % 7;
  localDate.setUTCDate(localDate.getUTCDate() - daysSinceMonday);
  return localDate.toISOString().slice(0, 10);
}

function readWeeklyState(filePath) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!value || typeof value.updatedWeek !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.updatedWeek)
      || !['partial', 'complete'].includes(value.status)) {
      throw new Error('Invalid weekly update state schema.');
    }
    return value;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function isWeekUpdated(filePath, weekKey) {
  return readWeeklyState(filePath)?.updatedWeek === weekKey;
}

function recordWeekUpdate(filePath, update) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  const state = {
    updatedWeek: update.weekKey,
    status: update.status,
    updatedAt: update.updatedAt.toISOString(),
    additions: update.additions,
    removals: update.removals,
    sourceFailures: update.sourceFailures,
    timeZone: 'Asia/Tokyo'
  };
  fs.writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function appendWorkflowOutput(outputPath, key, value) {
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `${key}=${value}\n`, 'utf8');
}

function isWeeklyUpdateComplete(selectedCount, sourceFailureCount, maxNewItems = 8) {
  return selectedCount === maxNewItems && sourceFailureCount === 0;
}

module.exports = { getJstWeekKey, readWeeklyState, isWeekUpdated, recordWeekUpdate, appendWorkflowOutput, isWeeklyUpdateComplete };
