"use strict";

const itemsBody = document.querySelector("#items-body");
const rowTemplate = document.querySelector("#item-row-template");
const addItemButton = document.querySelector("#add-item");
const subtotalElement = document.querySelector("#subtotal");
const discountRate = document.querySelector("#discount-rate");
const vatRate = document.querySelector("#vat-rate");
const currency = document.querySelector("#currency");
const discountRow = document.querySelector("#discount-row");
const discountTotal = document.querySelector("#discount-total");
const discountedRow = document.querySelector("#discounted-row");
const discountedTotal = document.querySelector("#discounted-total");
const vatRow = document.querySelector("#vat-row");
const vatTotal = document.querySelector("#vat-total");
const grandTotal = document.querySelector("#grand-total");
const estimateDate = document.querySelector("#estimate-date");
const estimateNumber = document.querySelector('[name="estimate-number"]');
const comment = document.querySelector("#comment");
const printEstimateButton = document.querySelector("#print-estimate");
const saveExcelButton = document.querySelector("#save-excel");
const printEstimateNumber = document.querySelector("#print-estimate-number");
const printEstimateDate = document.querySelector("#print-estimate-date");
const printComment = document.querySelector("#print-comment");
const sender = document.querySelector('[name="sender"]');
const recipient = document.querySelector('[name="recipient"]');

function getLocalDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateForPrint(value) {
  const parts = String(value).split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function updatePrintDetails() {
  printEstimateNumber.textContent = estimateNumber.value.trim() || "б/н";
  printEstimateDate.textContent = formatDateForPrint(estimateDate.value);
  printComment.textContent = comment.value.trim();
}

function parseNumber(value) {
  const normalizedValue = String(value)
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");

  if (normalizedValue === "" || !/^[-+]?\d*(?:\.\d+)?$/.test(normalizedValue)) {
    return 0;
  }

  const number = Number(normalizedValue);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(Math.round(safeValue))} ${currency.value}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createCrc32Table() {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }

    table[index] = value >>> 0;
  }

  return table;
}

const crc32Table = createCrc32Table();

function calculateCrc32(bytes) {
  let crc = 0xffffffff;

  bytes.forEach((byte) => {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });

  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function joinByteArrays(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });

  return result;
}

function getDosDateTime(date) {
  const safeYear = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((safeYear - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { dosTime, dosDate };
}

function createZipArchive(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  const timestamp = getDosDateTime(new Date());
  let localOffset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const crc = calculateCrc32(dataBytes);
    const localHeader = new Uint8Array(30);

    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, timestamp.dosTime);
    writeUint16(localHeader, 12, timestamp.dosDate);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, dataBytes.length);
    writeUint32(localHeader, 22, dataBytes.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);

    localParts.push(localHeader, nameBytes, dataBytes);

    const centralHeader = new Uint8Array(46);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, timestamp.dosTime);
    writeUint16(centralHeader, 14, timestamp.dosDate);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, dataBytes.length);
    writeUint32(centralHeader, 24, dataBytes.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, localOffset);

    centralParts.push(centralHeader, nameBytes);
    localOffset += localHeader.length + nameBytes.length + dataBytes.length;
  });

  const centralDirectory = joinByteArrays(centralParts);
  const endRecord = new Uint8Array(22);
  writeUint32(endRecord, 0, 0x06054b50);
  writeUint16(endRecord, 4, 0);
  writeUint16(endRecord, 6, 0);
  writeUint16(endRecord, 8, files.length);
  writeUint16(endRecord, 10, files.length);
  writeUint32(endRecord, 12, centralDirectory.length);
  writeUint32(endRecord, 16, localOffset);
  writeUint16(endRecord, 20, 0);

  return joinByteArrays([...localParts, centralDirectory, endRecord]);
}

function inlineStringCell(reference, value, style = 0) {
  const styleAttribute = style ? ` s="${style}"` : "";
  return `<c r="${reference}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function numberCell(reference, value, style = 0, formula = "") {
  const safeValue = Number.isFinite(value) ? value : 0;
  const styleAttribute = style ? ` s="${style}"` : "";
  const formulaXml = formula ? `<f>${escapeXml(formula)}</f>` : "";
  return `<c r="${reference}"${styleAttribute}>${formulaXml}<v>${safeValue}</v></c>`;
}

function dateToExcelSerial(value) {
  const parts = String(value).split("-").map(Number);

  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return 0;
  }

  return Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000 + 25569;
}

function buildEstimateWorkbook(data) {
  const itemStartRow = 7;
  const itemEndRow = itemStartRow + data.items.length - 1;
  const summaryStartRow = itemEndRow + 2;
  const commentLabelRow = summaryStartRow + 7;
  const commentValueRow = commentLabelRow + 1;
  const signatureRow = commentValueRow + 2;
  const title = `Смета № ${data.number || "б/н"} от ${formatDateForPrint(data.date)}`;
  const currencyFormat = `#,##0 &quot;${escapeXml(data.currency)}&quot;`;
  const dateCell = data.date ? numberCell("E4", dateToExcelSerial(data.date), 7) : inlineStringCell("E4", "", 0);
  const rows = [];

  rows.push(`<row r="1" ht="25" customHeight="1">${inlineStringCell("A1", title, 1)}</row>`);
  rows.push(`<row r="3">${inlineStringCell("A3", "От кого", 2)}${inlineStringCell("B3", data.sender, 0)}${inlineStringCell("D3", "Для кого", 2)}${inlineStringCell("E3", data.recipient, 0)}</row>`);
  rows.push(`<row r="4">${inlineStringCell("A4", "Номер сметы", 2)}${inlineStringCell("B4", data.number, 0)}${inlineStringCell("D4", "Дата", 2)}${dateCell}</row>`);
  rows.push(`<row r="6" ht="22" customHeight="1">${inlineStringCell("A6", "Наименование", 3)}${inlineStringCell("B6", "Количество", 3)}${inlineStringCell("C6", "Единица", 3)}${inlineStringCell("D6", "Цена", 3)}${inlineStringCell("E6", "Сумма", 3)}</row>`);

  data.items.forEach((item, index) => {
    const rowNumber = itemStartRow + index;
    rows.push(`<row r="${rowNumber}">${inlineStringCell(`A${rowNumber}`, item.name, 4)}${numberCell(`B${rowNumber}`, item.quantity, 5)}${inlineStringCell(`C${rowNumber}`, item.unit, 4)}${numberCell(`D${rowNumber}`, item.price, 6)}${numberCell(`E${rowNumber}`, item.lineTotal, 6, `ROUND(B${rowNumber}*D${rowNumber},0)`)}</row>`);
  });

  const subtotalRow = summaryStartRow;
  const discountRowNumber = summaryStartRow + 1;
  const afterDiscountRow = summaryStartRow + 2;
  const vatRowNumber = summaryStartRow + 3;
  const amountDueRow = summaryStartRow + 4;

  rows.push(`<row r="${subtotalRow}">${inlineStringCell(`A${subtotalRow}`, "Скидка, %", 2)}${numberCell(`B${subtotalRow}`, data.discountPercent / 100, 8)}${inlineStringCell(`D${subtotalRow}`, "Сумма", 9)}${numberCell(`E${subtotalRow}`, data.subtotal, 10, `ROUND(SUM(E${itemStartRow}:E${itemEndRow}),0)`)}</row>`);
  rows.push(`<row r="${discountRowNumber}">${inlineStringCell(`A${discountRowNumber}`, "НДС, %", 2)}${numberCell(`B${discountRowNumber}`, data.vatPercent / 100, 8)}${inlineStringCell(`D${discountRowNumber}`, "Скидка", 9)}${numberCell(`E${discountRowNumber}`, -data.discount, 10, `-ROUND(E${subtotalRow}*B${subtotalRow},0)`)}</row>`);
  rows.push(`<row r="${afterDiscountRow}">${inlineStringCell(`A${afterDiscountRow}`, "Валюта", 2)}${inlineStringCell(`B${afterDiscountRow}`, data.currency, 4)}${inlineStringCell(`D${afterDiscountRow}`, "Сумма со скидкой", 9)}${numberCell(`E${afterDiscountRow}`, data.afterDiscount, 10, `E${subtotalRow}+E${discountRowNumber}`)}</row>`);
  rows.push(`<row r="${vatRowNumber}">${inlineStringCell(`D${vatRowNumber}`, "НДС", 9)}${numberCell(`E${vatRowNumber}`, data.vat, 10, `ROUND(E${afterDiscountRow}*B${discountRowNumber},0)`)}</row>`);
  rows.push(`<row r="${amountDueRow}" ht="22" customHeight="1">${inlineStringCell(`D${amountDueRow}`, "Итого к оплате", 12)}${numberCell(`E${amountDueRow}`, data.amountDue, 13, `E${afterDiscountRow}+E${vatRowNumber}`)}</row>`);
  rows.push(`<row r="${commentLabelRow}">${inlineStringCell(`A${commentLabelRow}`, "Комментарий", 2)}</row>`);
  rows.push(`<row r="${commentValueRow}" ht="42" customHeight="1">${inlineStringCell(`A${commentValueRow}`, data.comment, 11)}</row>`);
  rows.push(`<row r="${signatureRow}">${inlineStringCell(`A${signatureRow}`, "Подпись ____________________", 2)}</row>`);

  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:E${signatureRow}"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="2" width="14" customWidth="1"/><col min="3" max="3" width="14" customWidth="1"/><col min="4" max="4" width="21" customWidth="1"/><col min="5" max="5" width="20" customWidth="1"/></cols>
  <sheetData>${rows.join("")}</sheetData>
  <mergeCells count="4"><mergeCell ref="A1:E1"/><mergeCell ref="B3:C3"/><mergeCell ref="B4:C4"/><mergeCell ref="A${commentValueRow}:E${commentValueRow}"/></mergeCells>
  <autoFilter ref="A6:E${itemEndRow}"/>
  <pageMargins left="0.35" right="0.35" top="0.45" bottom="0.45" header="0.2" footer="0.2"/>
  <pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2"><numFmt numFmtId="164" formatCode="${currencyFormat}"/><numFmt numFmtId="165" formatCode="0.##%"/></numFmts>
  <fonts count="4">
    <font><sz val="11"/><name val="Arial"/></font>
    <font><b/><sz val="16"/><name val="Arial"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><name val="Arial"/></font>
  </fonts>
  <fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF21152D"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDF5F2"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="3"><border/><border><left style="thin"><color rgb="FFB7B7B7"/></left><right style="thin"><color rgb="FFB7B7B7"/></right><top style="thin"><color rgb="FFB7B7B7"/></top><bottom style="thin"><color rgb="FFB7B7B7"/></bottom><diagonal/></border><border><bottom style="double"><color rgb="FF21152D"/></bottom></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="14">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="165" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0"/>
    <xf numFmtId="164" fontId="3" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="2" xfId="0"/>
    <xf numFmtId="164" fontId="3" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const createdAt = new Date().toISOString();
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { name: "docProps/core.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>Смета за 5 минут</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${createdAt}</dcterms:modified></cp:coreProperties>` },
    { name: "docProps/app.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Смета за 5 минут</Application></Properties>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Смета" sheetId="1" r:id="rId1"/></sheets><calcPr calcId="191029" calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", content: worksheetXml },
    { name: "xl/styles.xml", content: stylesXml }
  ];

  return new Blob([createZipArchive(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

function downloadBlob(blob, fileName) {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

function calculateTotals() {
  let total = 0;
  const items = [];

  itemsBody.querySelectorAll(".item-row").forEach((row) => {
    const quantity = parseNumber(row.querySelector(".item-quantity").value);
    const price = parseNumber(row.querySelector(".item-price").value);
    const name = row.querySelector(".item-name").value.trim();
    const unit = row.querySelector(".item-unit").value;
    const lineTotal = quantity * price;
    const safeLineTotal = Number.isFinite(lineTotal) ? Math.round(lineTotal) : 0;

    row.querySelector(".line-total").textContent = formatMoney(safeLineTotal);
    const nextTotal = total + safeLineTotal;
    total = Number.isFinite(nextTotal) ? nextTotal : 0;
    items.push({ name, quantity, unit, price, lineTotal: safeLineTotal });
  });

  const subtotal = Math.round(total);
  const discountPercent = Math.max(0, parseNumber(discountRate.value));
  const vatPercent = Math.max(0, parseNumber(vatRate.value));
  const discount = Math.round(subtotal * discountPercent / 100);
  const afterDiscount = subtotal - discount;
  const vat = Math.round(afterDiscount * vatPercent / 100);
  const amountDue = afterDiscount + vat;

  subtotalElement.textContent = formatMoney(subtotal);
  discountTotal.textContent = formatMoney(-discount);
  discountedTotal.textContent = formatMoney(afterDiscount);
  vatTotal.textContent = formatMoney(vat);
  grandTotal.textContent = formatMoney(amountDue);

  discountRow.hidden = discount === 0;
  discountedRow.hidden = discount === 0;
  vatRow.hidden = vat === 0;

  return {
    items,
    subtotal,
    discountPercent,
    vatPercent,
    discount,
    afterDiscount,
    vat,
    amountDue
  };
}

function saveEstimateAsExcel() {
  const totals = calculateTotals();
  const estimateData = {
    ...totals,
    sender: sender.value.trim(),
    recipient: recipient.value.trim(),
    number: estimateNumber.value.trim(),
    date: estimateDate.value,
    currency: currency.value,
    comment: comment.value.trim()
  };
  const safeNumber = (estimateData.number || "без-номера").replace(/[\\/:*?"<>|]/g, "-");
  const safeDate = estimateData.date || getLocalDateValue();
  downloadBlob(buildEstimateWorkbook(estimateData), `Смета-${safeNumber}-${safeDate}.xlsx`);
}

function updateRowLabels() {
  itemsBody.querySelectorAll(".item-row").forEach((row, index) => {
    const rowNumber = index + 1;
    row.querySelector(".item-name").setAttribute("aria-label", `Наименование позиции ${rowNumber}`);
    row.querySelector(".item-quantity").setAttribute("aria-label", `Количество, позиция ${rowNumber}`);
    row.querySelector(".item-unit").setAttribute("aria-label", `Единица измерения, позиция ${rowNumber}`);
    row.querySelector(".item-price").setAttribute("aria-label", `Цена, позиция ${rowNumber}`);
    row.querySelector(".delete-button").setAttribute("aria-label", `Удалить позицию ${rowNumber}`);
  });
}

function addItem({ focusName = false } = {}) {
  const fragment = rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".item-row");
  itemsBody.appendChild(fragment);
  updateRowLabels();
  calculateTotals();

  if (focusName) {
    row.querySelector(".item-name").focus();
  }
}

function removeItem(row) {
  row.remove();

  if (itemsBody.children.length === 0) {
    addItem();
  } else {
    updateRowLabels();
    calculateTotals();
  }
}

itemsBody.addEventListener("input", (event) => {
  if (event.target.matches(".item-quantity, .item-price")) {
    calculateTotals();
  }
});

itemsBody.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete-button");

  if (deleteButton) {
    removeItem(deleteButton.closest(".item-row"));
  }
});

itemsBody.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing) {
    return;
  }

  const currentRow = event.target.closest(".item-row");
  const lastRow = itemsBody.lastElementChild;

  if (currentRow && currentRow === lastRow) {
    event.preventDefault();
    addItem({ focusName: true });
  }
});

addItemButton.addEventListener("click", () => {
  addItem({ focusName: true });
});

discountRate.addEventListener("input", calculateTotals);
vatRate.addEventListener("input", calculateTotals);
currency.addEventListener("change", calculateTotals);

printEstimateButton.addEventListener("click", () => {
  updatePrintDetails();
  window.print();
});

saveExcelButton.addEventListener("click", saveEstimateAsExcel);

window.addEventListener("beforeprint", updatePrintDetails);

estimateDate.value = getLocalDateValue();
addItem();
updatePrintDetails();
