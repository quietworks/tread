# RSS Feed Format Research

Research conducted on 2025-11-26 to identify common feed formats and edge cases for comprehensive testing.

## Feed Format Standards

### RSS 2.0 (Really Simple Syndication)
- **Adoption**: ~70% of existing feeds
- **Released**: 2002
- **Specification**: https://www.rssboard.org/rss-specification
- **Features**:
  - Simple XML structure
  - Supports namespaces for extensions
  - Most widely supported format
  - Optional enclosures for media (podcasts)

### RSS 1.0 (RDF Site Summary)
- **Released**: December 2000
- **Specification**: https://web.resource.org/rss/1.0/spec
- **Features**:
  - Based on RDF (Resource Description Framework)
  - Different XML structure than RSS 2.0
  - Extensible via RDF modules
  - Metadata-rich
  - Separates items from channel (unlike RSS 2.0)
  - Still used by some sites (WordPress supports it)

### Atom 1.0
- **Released**: 2003, standardized as RFC 4287 in 2005
- **Specification**: https://www.rfc-editor.org/rfc/rfc4287
- **Features**:
  - IETF standard
  - More robust than RSS 2.0
  - Better internationalization
  - Distinguishes between `published` and `updated` dates
  - Rich content type support (text, html, xhtml)
  - Required author information
  - Link relations

### RSS 0.91/0.92 (Legacy)
- **RSS 0.91**: Released July 1999 (Netscape)
  - Character limits (500/100 chars)
  - Maximum 15 items per channel
- **RSS 0.92**: Released December 2000 (UserLand)
  - Removed character limits
  - Added `enclosure` element (enabled podcasting)
  - Mostly compatible with 0.91

### JSON Feed 1.1
- **Released**: 2017
- **Specification**: https://www.jsonfeed.org/
- **Features**:
  - JSON instead of XML
  - Less widely supported
  - Modern, simpler format
- **Note**: Not currently supported by tread parser

## Current Test Coverage

### Existing Fixtures ✓
1. `tech-news.xml` - Basic RSS 2.0 with multiple items
2. `dev-blog.xml` - Basic Atom feed with entries
3. `empty.xml` - Empty RSS feed (no items)
4. `malformed.xml` - Invalid XML (missing closing tag)

### Parser Support Analysis
Based on `src/feed/parser.ts:1-146`:
- ✓ RSS 2.0 parsing
- ✓ Atom parsing
- ✓ `content:encoded` namespace handling
- ✓ CDATA handling (via fast-xml-parser)
- ✓ Atom link attributes
- ✓ Atom published/updated dates
- ✗ RSS 1.0 (RDF format) - not supported
- ✗ RSS 0.91/0.92 - may work but untested
- ? Enclosures - parser doesn't extract them
- ? Author information - parser doesn't extract it
- ? Categories - parser doesn't extract them

## Recommended Test Fixtures

### High Priority - Common Real-World Cases

#### 1. RSS with content:encoded + CDATA
**Rationale**: Many blogs use WordPress which outputs full HTML content in `content:encoded` wrapped in CDATA
```xml
<content:encoded><![CDATA[<p>Full HTML content here</p>]]></content:encoded>
```
**Current support**: Parser handles this at line 56

#### 2. RSS with Enclosures (Podcast Feed)
**Rationale**: Podcasting is a major RSS use case, enclosures are essential
```xml
<enclosure url="http://example.com/podcast.mp3" length="12345" type="audio/mpeg"/>
```
**Current support**: Not extracted by parser

#### 3. Atom with HTML Content
**Rationale**: Atom feeds often contain full HTML content with entities
```xml
<content type="html">&lt;p&gt;HTML content&lt;/p&gt;</content>
```
**Current support**: Parser should handle this

#### 4. Atom with XHTML Content
**Rationale**: Atom allows inline XHTML in a div wrapper
```xml
<content type="xhtml">
  <div xmlns="http://www.w3.org/1999/xhtml">
    <p>XHTML content</p>
  </div>
</content>
```
**Current support**: Needs testing

#### 5. Feed with Special Characters and Entities
**Rationale**: Real feeds contain quotes, ampersands, unicode, etc.
```xml
<title>The "Best" Guide &amp; More – Unicode: 日本語</title>
```
**Current support**: Should work via fast-xml-parser

#### 6. RSS with Multiple Namespaces
**Rationale**: Common in production feeds (Dublin Core, Media RSS, etc.)
```xml
<rss xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:creator>Author Name</dc:creator>
</rss>
```
**Current support**: Namespaces work, but metadata not extracted

### Medium Priority - Edge Cases

#### 7. RSS 1.0 (RDF)
**Rationale**: Still used by some sites, completely different structure
**Current support**: Not supported - would throw "Unknown feed format" error

#### 8. Atom with Multiple Links
**Rationale**: Atom entries can have multiple link relations (alternate, related, enclosure)
```xml
<link rel="alternate" href="https://example.com/article"/>
<link rel="enclosure" href="https://example.com/audio.mp3"/>
```
**Current support**: Parser looks for alternate links

#### 9. Atom with Author Information
**Rationale**: Atom requires author at feed or entry level
```xml
<author>
  <name>John Doe</name>
  <email>john@example.com</email>
  <uri>https://example.com/john</uri>
</author>
```
**Current support**: Not extracted

#### 10. Feed with Only One Item
**Rationale**: Edge case for array handling
**Current support**: Parser handles via ternary at line 43-47

#### 11. Feed with Missing Optional Fields
**Rationale**: Test graceful degradation
- RSS item without guid, link, or pubDate
- Atom entry without published date
**Current support**: Parser generates IDs and handles nulls

### Low Priority - Legacy/Rare

#### 12. RSS 0.91 Format
**Rationale**: Old format with strict limits, rare in the wild
**Current support**: Likely works but untested

#### 13. Feed with Invalid Dates
**Rationale**: Test date parsing robustness
```xml
<pubDate>Not a valid date</pubDate>
```
**Current support**: Returns null at line 20

#### 14. Atom with published vs updated
**Rationale**: Ensure both dates are respected
```xml
<published>2024-01-01T00:00:00Z</published>
<updated>2024-01-15T00:00:00Z</updated>
```
**Current support**: Prefers published, falls back to updated (line 119)

## Implementation Recommendations

### Fixtures to Create (in priority order)

1. **rss-content-encoded.xml** - RSS 2.0 with content:encoded and CDATA
2. **rss-podcast.xml** - RSS 2.0 with enclosures (podcast feed)
3. **atom-html-content.xml** - Atom with type="html" content
4. **atom-xhtml-content.xml** - Atom with type="xhtml" content
5. **feed-special-chars.xml** - Feed with entities, unicode, special chars
6. **rss-namespaces.xml** - RSS with Dublin Core and other namespaces
7. **rss-1.0-rdf.xml** - RSS 1.0 (RDF) format
8. **atom-multiple-links.xml** - Atom with various link relations
9. **atom-authors.xml** - Atom with author metadata
10. **feed-single-item.xml** - Feed with exactly one item
11. **feed-missing-fields.xml** - Feed with minimal required fields only
12. **rss-0.91.xml** - Legacy RSS 0.91 format (if needed)
13. **feed-invalid-dates.xml** - Feed with malformed date strings
14. **atom-published-updated.xml** - Atom with both date types

### Test Strategy

For automated tests, fixtures should cover:
- ✅ **Happy path**: Valid feeds parse correctly
- ✅ **Edge cases**: Empty feeds, single items, missing fields
- ✅ **Error cases**: Malformed XML, unknown formats
- 🔲 **Format variants**: RSS 2.0, RSS 1.0, Atom, legacy versions
- 🔲 **Content types**: Plain text, HTML, XHTML, CDATA
- 🔲 **Namespaces**: content:encoded, Dublin Core, Media RSS
- 🔲 **Media**: Enclosures for podcasts/attachments
- 🔲 **Character encoding**: Unicode, entities, special chars
- 🔲 **Metadata**: Authors, categories, dates

## References

- [Simple RSS, Atom and JSON feed for your blog](https://pawelgrzybek.com/simple-rss-atom-and-json-feed-for-your-blog/)
- [RSS Feed Best Practices - MoldStud](https://moldstud.com/articles/p-a-comprehensive-guide-to-exploring-various-formats-for-creating-rss-feeds)
- [RSS Wikipedia](https://en.wikipedia.org/wiki/RSS)
- [RDF Site Summary (RSS) 1.0 Spec](https://web.resource.org/rss/1.0/spec)
- [RSS Best Practices Profile](https://www.rssboard.org/rss-profile)
- [RSS Encoding Examples](https://www.rssboard.org/rss-encoding-examples)
- [How to declare namespaces in feeds](https://validator.w3.org/feed/docs/howto/declare_namespaces.html)
- [Introduction to Atom](https://validator.w3.org/feed/docs/atom.html)
- [RFC 4287: The Atom Syndication Format](https://www.rfc-editor.org/rfc/rfc4287)
- [RSS Version History - TutorialsPoint](https://www.tutorialspoint.com/rss/rss-version-history.htm)
- [RSS 0.91 Specification](https://www.rssboard.org/rss-0-9-1)
- [Going Static Part 2 - RSS Secrets](https://www.hughrundle.net/going-static-part-2/)
