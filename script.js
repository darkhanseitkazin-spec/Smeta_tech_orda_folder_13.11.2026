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
const printEstimateNumber = document.querySelector("#print-estimate-number");
const printEstimateDate = document.querySelector("#print-estimate-date");
const printComment = document.querySelector("#print-comment");

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

function calculateTotals() {
  let total = 0;

  itemsBody.querySelectorAll(".item-row").forEach((row) => {
    const quantity = parseNumber(row.querySelector(".item-quantity").value);
    const price = parseNumber(row.querySelector(".item-price").value);
    const lineTotal = quantity * price;
    const safeLineTotal = Number.isFinite(lineTotal) ? Math.round(lineTotal) : 0;

    row.querySelector(".line-total").textContent = formatMoney(safeLineTotal);
    const nextTotal = total + safeLineTotal;
    total = Number.isFinite(nextTotal) ? nextTotal : 0;
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

window.addEventListener("beforeprint", updatePrintDetails);

estimateDate.value = getLocalDateValue();
addItem();
updatePrintDetails();
