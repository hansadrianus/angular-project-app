const fs = require('fs');
const path = require('path');

const specPath = path.resolve('docs/superpowers/specs/2026-11-06-projectflow-design.md');
let doc = fs.readFileSync(specPath, 'utf8').replace(/\r\n/g, '\n');

doc = doc.replace(
  `- \`GanttComponent\` — the timeline; dual-row header (week groups + day numbers/letters), visible weekend & holiday column shading (warm red with \`🏖️\` badge for holidays, soft grey for weekends), interactive popover on clicking any day header or column to "Mark as Holiday" / "Mark as Weekend/Working day", plan bars (blue, red when overdue), actual bars (green, red when late), summary bars, milestone diamonds, dependency arrows (SVG), today line, bar drag/resize`,
  `- \`GanttComponent\` — the timeline; dual-tier header (month/year group banner + individual day columns displaying the calendar date e.g. "Oct 5" and day-of-week "Mon"), timeline columns with calendar date labels and visible weekend & holiday shading (warm red with \`🏖️\` badge for holidays, soft grey for weekends), zoom controls (🔍− / 🔍+), interactive popover on clicking any day header or column to "Mark as Holiday" / "Mark as Weekend/Working day", plan bars (blue, red when overdue), actual bars (green, red when late), summary bars, milestone diamonds, dependency arrows (SVG), today line, bar drag/resize`
);

fs.writeFileSync(specPath, doc, 'utf8');
console.log('Updated design spec');
