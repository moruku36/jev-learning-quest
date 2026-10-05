'use strict';

function validateExpectedFeed(payload) {
  const text = String(payload || '').replace(/^\uFEFF/, '');
  const rss = /^\s*(?:<\?xml\b[^?]*\?>\s*)?<rss\b[\s\S]*?<channel\b[\s\S]*?<\/channel\s*>[\s\S]*?<\/rss\s*>\s*$/i.test(text);
  const atom = /^\s*(?:<\?xml\b[^?]*\?>\s*)?<feed\b[\s\S]*?<\/feed\s*>\s*$/i.test(text);
  const rdf = /^\s*(?:<\?xml\b[^?]*\?>\s*)?<rdf:RDF\b[\s\S]*?<\/rdf:RDF\s*>\s*$/i.test(text);
  return rss || atom || rdf;
}

function validateExpectedAnthropicNewsroom(payload) {
  const text = String(payload || '').replace(/^\uFEFF/, '');
  return /<html\b/i.test(text)
    && /\/news\/[\w-]+/i.test(text)
    && /class="[^"]*__title[^"]*"/i.test(text);
}

function containsFeedEntries(payload) {
  return /<(?:item|entry)\b/i.test(String(payload || ''));
}

function containsAnthropicNewsCards(payload) {
  const text = String(payload || '');
  return /\/news\/[\w-]+/i.test(text) && /class="[^"]*__title[^"]*"/i.test(text);
}

module.exports = {
  validateExpectedFeed,
  validateExpectedAnthropicNewsroom,
  containsFeedEntries,
  containsAnthropicNewsCards
};
