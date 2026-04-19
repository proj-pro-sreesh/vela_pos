const fs = require('fs');

const filePath = 'client/src/pages/Tables.jsx';

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    process.exit(1);
  }

  const lines = data.split('\n');
  let modified = false;
  const newLines = [...lines];

  for (let i = 0; i < newLines.length; i++) {
    const line = newLines[i];
    // Check if this line is the Grid item for Order Items (exact match with optional leading spaces)
    // We look for: <Grid item xs={12} md={5}> possibly with leading whitespace
    const trimmed = line.trim();
    if (trimmed === '<Grid item xs={12} md={5}>') {
      // Check if next two lines match the Order Items header pattern
      if (i + 2 < newLines.length) {
        const nextLine = newLines[i + 1];
        const nextNextLine = newLines[i + 2];
        // The pattern: next line should be <Box> (with some indentation) and the one after should contain <Typography variant="h6" sx={{ mb: 2 }}>Order Items</Typography>
        const nextTrimmed = nextLine.trim();
        const nextNextTrimmed = nextNextLine.trim();
        if (nextTrimmed === '<Box>' && nextNextTrimmed.includes('Order Items</Typography>')) {
          // Get the leading whitespace from the original line
          const leadingWhitespace = line.match(/^\s*/)[0];
          // Replace with the same line but with sx prop
          const newLine = leadingWhitespace + '<Grid item xs={12} md={5} sx={{ maxHeight: \'60vh\', overflowY: \'auto\', pr: 1 }}>';
          newLines[i] = newLine;
          modified = true;
          console.log(`Modified line ${i + 1}: added scrolling to Order Items Grid`);
        }
      }
    }
  }

  if (modified) {
    fs.writeFile(filePath, newLines.join('\n'), (err) => {
      if (err) {
        console.error('Error writing file:', err);
        process.exit(1);
      }
      console.log('File successfully updated with scrolling on Order Items.');
    });
  } else {
    console.log('No matching Grid items found. File not modified.');
  }
});
