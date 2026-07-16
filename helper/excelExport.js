const ExcelJS = require('exceljs');

// Excel (and Google Sheets) treats a cell value starting with =, +, - or @
// as the start of a formula even when it arrived as plain user-entered
// text (a customer's name, message, subject, ...) — prefixing a literal
// single quote forces text interpretation without changing what's shown,
// which is the standard mitigation for formula-injection via exported data.
const RISKY_PREFIX = /^[=+\-@]/;
function safeText(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    return RISKY_PREFIX.test(str) ? `'${str}` : str;
}

// Builds a `WHERE (col1 LIKE ? OR col2 LIKE ? ...)` fragment across a set
// of columns for a single free-text search term — mirrors the OR-substring
// matching each admin page already does client-side, just server-side and
// parameterised (never string-concatenated into the query).
function buildSearchClause(columns, term) {
    const t = (term || '').trim();
    if (!t) return { clause: '', params: [] };
    const like = `%${t}%`;
    return {
        clause: `(${columns.map(c => `${c} LIKE ?`).join(' OR ')})`,
        params: columns.map(() => like),
    };
}

// Combines any number of { clause, params } fragments (some possibly
// empty) into one `WHERE a AND b AND c` clause plus the flattened params.
function combineClauses(fragments) {
    const active = fragments.filter(f => f.clause);
    if (active.length === 0) return { where: '', params: [] };
    return {
        where: `WHERE ${active.map(f => f.clause).join(' AND ')}`,
        params: active.flatMap(f => f.params),
    };
}

// columns: [{ header, key, type: 'text'|'number'|'currency'|'date', width? }]
// rows: plain objects keyed by column.key
function buildWorkbook({ sheetName, columns, rows }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Yogo Ventures Admin';
    workbook.created = new Date();

    // Sheet names can't exceed 31 characters in Excel.
    const sheet = workbook.addWorksheet(String(sheetName).slice(0, 31), {
        views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || Math.min(Math.max(col.header.length + 4, 14), 42),
    }));

    for (const row of rows) {
        const rowValues = {};
        for (const col of columns) {
            const v = row[col.key];
            if (col.type === 'date') {
                rowValues[col.key] = v ? new Date(v) : null;
            } else if (col.type === 'number' || col.type === 'currency') {
                rowValues[col.key] = (v === null || v === undefined || v === '') ? null : Number(v);
            } else {
                rowValues[col.key] = safeText(v ?? '');
            }
        }
        sheet.addRow(rowValues);
    }

    columns.forEach((col, i) => {
        const excelCol = sheet.getColumn(i + 1);
        if (col.type === 'date') excelCol.numFmt = 'dd-mm-yyyy';
        else if (col.type === 'currency') excelCol.numFmt = '"₹"#,##0.00';
        else if (col.type === 'number') excelCol.numFmt = '#,##0';
        // Multi-product order rows join several lines with \n into one
        // cell (see exportOrderTracking) — wrap so every line is visible
        // once the row height is expanded, instead of Excel showing only
        // the first line.
        if (col.wrap) excelCol.alignment = { wrapText: true, vertical: 'top' };
    });

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle' };
    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to:   { row: 1, column: columns.length },
    };

    return workbook;
}

// e.g. buildExportFilename('quote-enquiries') → "quote-enquiries-15-07-2026.xlsx"
function buildExportFilename(prefix) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${prefix}-${dd}-${mm}-${yyyy}.xlsx`;
}

async function sendWorkbook(res, workbook, filename) {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
}

module.exports = { safeText, buildSearchClause, combineClauses, buildWorkbook, buildExportFilename, sendWorkbook };
