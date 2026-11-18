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
const amountWordsRow = document.querySelector("#amount-words-row");
const amountWords = document.querySelector("#amount-words");
const estimateDate = document.querySelector("#estimate-date");
const estimateNumber = document.querySelector('[name="estimate-number"]');
const comment = document.querySelector("#comment");
const printEstimateButton = document.querySelector("#print-estimate");
const saveExcelButton = document.querySelector("#save-excel");
const emailEstimateButton = document.querySelector("#email-estimate");
const printEstimateNumber = document.querySelector("#print-estimate-number");
const printEstimateDate = document.querySelector("#print-estimate-date");
const printComment = document.querySelector("#print-comment");
const emailDialog = document.querySelector("#email-dialog");
const closeEmailDialogButton = document.querySelector("#close-email-dialog");
const cancelEmailButton = document.querySelector("#cancel-email");
const emailSavePdfButton = document.querySelector("#email-save-pdf");
const emailPdfFile = document.querySelector("#email-pdf-file");
const clientEmail = document.querySelector("#client-email");
const shareEmailButton = document.querySelector("#share-email");
const emailStatus = document.querySelector("#email-status");

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

function getEstimateEmailSubject() {
  const number = estimateNumber.value.trim() || "б/н";
  const date = formatDateForPrint(estimateDate.value);
  return `Смета № ${number}${date ? ` от ${date}` : ""}`;
}

function getEstimateEmailBody() {
  const recipientName = document.querySelector('[name="recipient"]').value.trim();
  const greeting = recipientName ? `Здравствуйте, ${recipientName}!` : "Здравствуйте!";
  const totals = calculateTotals();
  const words = amountToWords(totals.amountDue);
  const totalLines = [`Итого к оплате: ${formatMoney(totals.amountDue)}`];

  if (currency.value === "₸" && words) {
    totalLines.push(`Сумма прописью: ${words}`);
  }

  return `${greeting}\n\nНаправляю смету в формате PDF.\n\n${totalLines.join("\n")}\n\nС уважением.`;
}

function showEmailStatus(message) {
  emailStatus.textContent = message;
}

function openEmailDialog() {
  showEmailStatus("");

  if (typeof emailDialog.showModal === "function") {
    emailDialog.showModal();
  } else {
    emailDialog.setAttribute("open", "");
  }
}

function closeEmailDialog() {
  if (typeof emailDialog.close === "function") {
    emailDialog.close();
  } else {
    emailDialog.removeAttribute("open");
  }
}

function openEmailDraft() {
  const address = clientEmail.value.trim();
  const subject = encodeURIComponent(getEstimateEmailSubject());
  const body = encodeURIComponent(getEstimateEmailBody());
  window.location.href = `mailto:${encodeURIComponent(address)}?subject=${subject}&body=${body}`;
  showEmailStatus("Почтовое приложение открыто. Прикрепите выбранный PDF к письму.");
}

async function shareEstimatePdf() {
  const pdfFile = emailPdfFile.files[0];

  if (!pdfFile) {
    showEmailStatus("Сначала выберите сохранённый PDF-файл.");
    emailPdfFile.focus();
    return;
  }

  if (!pdfFile.name.toLowerCase().endsWith(".pdf")) {
    showEmailStatus("Выберите файл с расширением .pdf.");
    emailPdfFile.focus();
    return;
  }

  if (clientEmail.value && !clientEmail.checkValidity()) {
    showEmailStatus("Проверьте адрес электронной почты.");
    clientEmail.focus();
    return;
  }

  const shareData = {
    files: [pdfFile],
    title: getEstimateEmailSubject(),
    text: getEstimateEmailBody()
  };
  const canShareFile = typeof navigator.share === "function"
    && typeof navigator.canShare === "function"
    && navigator.canShare({ files: [pdfFile] });

  if (!canShareFile) {
    openEmailDraft();
    return;
  }

  try {
    await navigator.share(shareData);
    showEmailStatus("PDF передан в выбранное приложение.");
  } catch (error) {
    if (error && error.name === "AbortError") {
      showEmailStatus("Отправка отменена.");
      return;
    }

    openEmailDraft();
  }
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

function getNumberForm(value, forms) {
  const lastTwoDigits = value % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return forms[2];
  }

  const lastDigit = value % 10;

  if (lastDigit === 1) {
    return forms[0];
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return forms[1];
  }

  return forms[2];
}

function numberGroupToWords(value, feminine = false) {
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];
  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  const teens = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
  const ones = feminine
    ? ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"]
    : ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const words = [];
  const hundredsDigit = Math.floor(value / 100);
  const lastTwoDigits = value % 100;

  if (hundredsDigit > 0) {
    words.push(hundreds[hundredsDigit]);
  }

  if (lastTwoDigits >= 10 && lastTwoDigits <= 19) {
    words.push(teens[lastTwoDigits - 10]);
  } else {
    const tensDigit = Math.floor(lastTwoDigits / 10);
    const onesDigit = lastTwoDigits % 10;

    if (tensDigit > 0) {
      words.push(tens[tensDigit]);
    }

    if (onesDigit > 0) {
      words.push(ones[onesDigit]);
    }
  }

  return words;
}

function amountToWords(value) {
  const amount = Math.round(Number(value));

  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999) {
    return "";
  }

  const groups = [
    {
      value: Math.floor(amount / 1000000),
      feminine: false,
      forms: ["миллион", "миллиона", "миллионов"]
    },
    {
      value: Math.floor(amount / 1000) % 1000,
      feminine: true,
      forms: ["тысяча", "тысячи", "тысяч"]
    },
    {
      value: amount % 1000,
      feminine: false,
      forms: null
    }
  ];
  const words = [];

  groups.forEach((group) => {
    if (group.value === 0) {
      return;
    }

    words.push(...numberGroupToWords(group.value, group.feminine));

    if (group.forms) {
      words.push(getNumberForm(group.value, group.forms));
    }
  });

  words.push("тенге");
  const result = words.join(" ");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function updateAmountInWords(amountDue) {
  const words = amountToWords(amountDue);
  const shouldShow = currency.value === "₸" && words !== "";

  amountWords.textContent = shouldShow ? words : "";
  amountWordsRow.hidden = !shouldShow;
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

function writeZipNumber(target, offset, value, byteCount) {
  for (let byteIndex = 0; byteIndex < byteCount; byteIndex += 1) {
    target[offset + byteIndex] = (value >>> (byteIndex * 8)) & 0xff;
  }
}

function joinBytes(parts) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  let localOffset = 0;

  files.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name);
    const dataBytes = encoder.encode(content);
    const crc = calculateCrc32(dataBytes);
    const localHeader = new Uint8Array(30);
    writeZipNumber(localHeader, 0, 0x04034b50, 4);
    writeZipNumber(localHeader, 4, 20, 2);
    writeZipNumber(localHeader, 6, 0x0800, 2);
    writeZipNumber(localHeader, 10, dosTime, 2);
    writeZipNumber(localHeader, 12, dosDate, 2);
    writeZipNumber(localHeader, 14, crc, 4);
    writeZipNumber(localHeader, 18, dataBytes.length, 4);
    writeZipNumber(localHeader, 22, dataBytes.length, 4);
    writeZipNumber(localHeader, 26, nameBytes.length, 2);
    localParts.push(localHeader, nameBytes, dataBytes);

    const centralHeader = new Uint8Array(46);
    writeZipNumber(centralHeader, 0, 0x02014b50, 4);
    writeZipNumber(centralHeader, 4, 20, 2);
    writeZipNumber(centralHeader, 6, 20, 2);
    writeZipNumber(centralHeader, 8, 0x0800, 2);
    writeZipNumber(centralHeader, 12, dosTime, 2);
    writeZipNumber(centralHeader, 14, dosDate, 2);
    writeZipNumber(centralHeader, 16, crc, 4);
    writeZipNumber(centralHeader, 20, dataBytes.length, 4);
    writeZipNumber(centralHeader, 24, dataBytes.length, 4);
    writeZipNumber(centralHeader, 28, nameBytes.length, 2);
    writeZipNumber(centralHeader, 42, localOffset, 4);
    centralParts.push(centralHeader, nameBytes);
    localOffset += localHeader.length + nameBytes.length + dataBytes.length;
  });

  const centralDirectory = joinBytes(centralParts);
  const endRecord = new Uint8Array(22);
  writeZipNumber(endRecord, 0, 0x06054b50, 4);
  writeZipNumber(endRecord, 8, files.length, 2);
  writeZipNumber(endRecord, 10, files.length, 2);
  writeZipNumber(endRecord, 12, centralDirectory.length, 4);
  writeZipNumber(endRecord, 16, localOffset, 4);
  return joinBytes([...localParts, centralDirectory, endRecord]);
}

function excelTextCell(reference, value, style = 0) {
  const styleAttribute = style ? ` s="${style}"` : "";
  return `<c r="${reference}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function excelNumberCell(reference, value, style = 0, formula = "") {
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

function buildExcelWorkbook(data) {
  const firstItemRow = 7;
  const lastItemRow = firstItemRow + data.items.length - 1;
  const totalsRow = lastItemRow + 2;
  const commentRow = totalsRow + 7;
  const lastRow = commentRow + 3;
  const moneyFormat = `#,##0 &quot;${escapeXml(data.currency)}&quot;`;
  const dateCell = data.date
    ? excelNumberCell("E4", dateToExcelSerial(data.date), 6)
    : excelTextCell("E4", "");
  const rows = [
    `<row r="1" ht="26" customHeight="1">${excelTextCell("A1", `Смета № ${data.number || "б/н"} от ${formatDateForPrint(data.date)}`, 1)}</row>`,
    `<row r="3">${excelTextCell("A3", "От кого", 2)}${excelTextCell("B3", data.sender)}${excelTextCell("D3", "Для кого", 2)}${excelTextCell("E3", data.recipient)}</row>`,
    `<row r="4">${excelTextCell("A4", "Номер сметы", 2)}${excelTextCell("B4", data.number)}${excelTextCell("D4", "Дата", 2)}${dateCell}</row>`,
    `<row r="6" ht="22" customHeight="1">${excelTextCell("A6", "Наименование", 3)}${excelTextCell("B6", "Количество", 3)}${excelTextCell("C6", "Единица", 3)}${excelTextCell("D6", "Цена", 3)}${excelTextCell("E6", "Сумма", 3)}</row>`
  ];

  data.items.forEach((item, index) => {
    const row = firstItemRow + index;
    rows.push(`<row r="${row}">${excelTextCell(`A${row}`, item.name, 4)}${excelNumberCell(`B${row}`, item.quantity, 4)}${excelTextCell(`C${row}`, item.unit, 4)}${excelNumberCell(`D${row}`, item.price, 5)}${excelNumberCell(`E${row}`, item.lineTotal, 5, `ROUND(B${row}*D${row},0)`)}</row>`);
  });

  rows.push(`<row r="${totalsRow}">${excelTextCell(`A${totalsRow}`, "Скидка, %", 2)}${excelNumberCell(`B${totalsRow}`, data.discountPercent / 100, 7)}${excelTextCell(`D${totalsRow}`, "Сумма", 8)}${excelNumberCell(`E${totalsRow}`, data.subtotal, 9, `ROUND(SUM(E${firstItemRow}:E${lastItemRow}),0)`)}</row>`);
  rows.push(`<row r="${totalsRow + 1}">${excelTextCell(`A${totalsRow + 1}`, "НДС, %", 2)}${excelNumberCell(`B${totalsRow + 1}`, data.vatPercent / 100, 7)}${excelTextCell(`D${totalsRow + 1}`, "Скидка", 8)}${excelNumberCell(`E${totalsRow + 1}`, -data.discount, 9, `-ROUND(E${totalsRow}*B${totalsRow},0)`)}</row>`);
  rows.push(`<row r="${totalsRow + 2}">${excelTextCell(`A${totalsRow + 2}`, "Валюта", 2)}${excelTextCell(`B${totalsRow + 2}`, data.currency, 4)}${excelTextCell(`D${totalsRow + 2}`, "Сумма со скидкой", 8)}${excelNumberCell(`E${totalsRow + 2}`, data.afterDiscount, 9, `E${totalsRow}+E${totalsRow + 1}`)}</row>`);
  rows.push(`<row r="${totalsRow + 3}">${excelTextCell(`D${totalsRow + 3}`, "НДС", 8)}${excelNumberCell(`E${totalsRow + 3}`, data.vat, 9, `ROUND(E${totalsRow + 2}*B${totalsRow + 1},0)`)}</row>`);
  rows.push(`<row r="${totalsRow + 4}" ht="22" customHeight="1">${excelTextCell(`D${totalsRow + 4}`, "Итого к оплате", 10)}${excelNumberCell(`E${totalsRow + 4}`, data.amountDue, 11, `E${totalsRow + 2}+E${totalsRow + 3}`)}</row>`);
  rows.push(`<row r="${commentRow}">${excelTextCell(`A${commentRow}`, "Комментарий", 2)}</row>`);
  rows.push(`<row r="${commentRow + 1}" ht="42" customHeight="1">${excelTextCell(`A${commentRow + 1}`, data.comment, 12)}</row>`);
  rows.push(`<row r="${commentRow + 3}">${excelTextCell(`A${commentRow + 3}`, "Подпись ____________________", 2)}</row>`);

  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:E${lastRow}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="3" width="14" customWidth="1"/><col min="4" max="5" width="20" customWidth="1"/></cols><sheetData>${rows.join("")}</sheetData><mergeCells count="4"><mergeCell ref="A1:E1"/><mergeCell ref="B3:C3"/><mergeCell ref="B4:C4"/><mergeCell ref="A${commentRow + 1}:E${commentRow + 1}"/></mergeCells><autoFilter ref="A6:E${lastItemRow}"/><pageMargins left="0.35" right="0.35" top="0.45" bottom="0.45" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="${moneyFormat}"/><numFmt numFmtId="165" formatCode="0.##%"/></numFmts><fonts count="4"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="16"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF21152D"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDF5F2"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/></patternFill></fill></fills><borders count="3"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border><border><bottom style="double"/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="13"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0"/><xf numFmtId="164" fontId="3" fillId="3" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="3" fillId="3" borderId="2" xfId="0"/><xf numFmtId="164" fontId="3" fillId="3" borderId="2" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Смета" sheetId="1" r:id="rId1"/></sheets><calcPr calcMode="auto" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/worksheets/sheet1.xml", content: worksheet },
    { name: "xl/styles.xml", content: styles }
  ];

  return new Blob([createZip(files)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  updateAmountInWords(amountDue);

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
  const data = {
    ...totals,
    sender: document.querySelector('[name="sender"]').value.trim(),
    recipient: document.querySelector('[name="recipient"]').value.trim(),
    number: estimateNumber.value.trim(),
    date: estimateDate.value,
    currency: currency.value,
    comment: comment.value.trim()
  };
  const safeNumber = (data.number || "без-номера").replace(/[\\/:*?"<>|]/g, "-");
  const safeDate = data.date || getLocalDateValue();
  downloadBlob(buildExcelWorkbook(data), `Смета-${safeNumber}-${safeDate}.xlsx`);
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

emailEstimateButton.addEventListener("click", openEmailDialog);
closeEmailDialogButton.addEventListener("click", closeEmailDialog);
cancelEmailButton.addEventListener("click", closeEmailDialog);

emailSavePdfButton.addEventListener("click", () => {
  updatePrintDetails();
  window.print();
});

shareEmailButton.addEventListener("click", shareEstimatePdf);
saveExcelButton.addEventListener("click", saveEstimateAsExcel);

window.addEventListener("beforeprint", updatePrintDetails);

estimateDate.value = getLocalDateValue();
addItem();
updatePrintDetails();
