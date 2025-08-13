// --- Language Toggle ---
const thaiFlag = document.getElementById('thai-flag');
const englishFlag = document.getElementById('english-flag');

function setLanguage(lang) {
  const elements = document.querySelectorAll('[data-th][data-en]');
  elements.forEach(el => {
    el.textContent = el.dataset[lang] || el.textContent;
  });
  document.documentElement.lang = lang;
}

thaiFlag?.addEventListener('click', () => setLanguage('th'));
englishFlag?.addEventListener('click', () => setLanguage('en'));
setLanguage('th');

// Language Santitization

function sanitizeForExport(value) {
  if (typeof value !== 'string') return value;
  return /^[=+\-@]/.test(value) ? "'" + value : value.replace(/[<>]/g, '');
}

// --- Spinner Overlay ---
const spinner = document.getElementById('spinnerOverlay');
const spinnerText = document.getElementById('spinnerText');

window.showSpinner = function (textKey) {
  if (spinner && spinnerText) {
    const lang = document.documentElement.lang || 'th';
    const spinnerTexts = {
      loading: { th: 'กำลังโหลด', en: 'Loading...' },
      saving: { th: 'กำลังบันทึกข้อมูล...', en: 'Saving Data...' },
      submitting: { th: 'กำลังส่งเกรด...', en: 'Submitting Grades...' },
      authenticating: { th: 'กำลังตรวจสอบ...', en: 'Authenticating...' },
    };
    spinnerText.textContent = spinnerTexts[textKey]?.[lang] || textKey;
    spinner.classList.remove('hidden');
    spinner.style.display = '';
  }
};

window.hideSpinner = function () {
  if (spinner) {
    spinner.classList.add('hidden');
    spinner.style.display = 'none';
  }
};

// --- Handle Navigation Links ---
document.querySelectorAll('a.styled-button[href]:not([data-no-nav])').forEach(link => {
  link.addEventListener('click', function (e) {
    if (this.target !== '_blank') {
      e.preventDefault();
      window.showSpinner('loading');
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.location.href = this.href;
        }, 1500);
      });
    }
  });
});

// --- Handle Login Form Submit ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    window.showSpinner('authenticating');
    setTimeout(() => {
      window.location.href = '../index.html';
    }, 1500);
  });
}






//  GRADEBOOK LOGIC


document.addEventListener("DOMContentLoaded", () => {
  const courseId = document.body.dataset.courseId || "UnknownCourse"; // e.g., "ENG202"
  const pageType = document.body.dataset.pageType || "gradebook"; // optional for export
  const sectionSelect = document.getElementById("sectionSelect");
  const gradebookTableBody = document.querySelector(".gradebook-table tbody");
  const exportBtn = document.getElementById("exportGradeExcelBtn");

  const saveBtn = document.getElementById("saveBtn");
  const spinnerOverlay = document.getElementById("spinnerOverlay");
  const spinnerText = document.getElementById("spinnerText");

  // 1. Populate section dropdown 1–40 if empty
  if (sectionSelect && sectionSelect.options.length <= 1) {
    for (let i = 1; i <= 40; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `Section ${i}`;
      sectionSelect.appendChild(option);
    }
  }

  // Helper: Calculate total max points (sum of max attribute on first data row inputs)
  function getTotalMaxPoints() {
    if (!gradebookTableBody) return 0;
    const firstRow = gradebookTableBody.querySelector("tr");
    if (!firstRow) return 0;
    const inputs = firstRow.querySelectorAll("input[type=number]");
    let total = 0;
    inputs.forEach(input => {
      const maxVal = Number(input.max);
      if (!isNaN(maxVal)) total += maxVal;
    });
    return total;
  }
  const totalMaxPoints = getTotalMaxPoints();

  // Calculate total and percent for a row
  function calculateRowTotals(row) {
    if (!row) return;
    const inputs = row.querySelectorAll("input[type=number]");
    let sum = 0;
    inputs.forEach(input => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) sum += val;
    });
    const totalCell = row.querySelector(".total-cell");
    const percentCell = row.querySelector(".percent-cell");

    if (totalCell) totalCell.textContent = sum.toFixed(2);
    if (percentCell) {
      const percent = totalMaxPoints > 0 ? Math.round((sum / totalMaxPoints) * 100) : 0;
      percentCell.textContent = isNaN(percent) ? "" : percent + "%";
    }
  }

  // Enforce min/max input values and prevent invalid input as user types
  function enforceInputLimits() {
    if (!gradebookTableBody) return;
    const inputs = gradebookTableBody.querySelectorAll("input[type=number]");

    inputs.forEach(input => {
      // Prevent invalid keys (allow only digits and control keys)
      input.addEventListener("keydown", (e) => {
        const allowedKeys = [
          "Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Enter", "Home", "End"
        ];
        const isNumberKey = /^[0-9.]$/.test(e.key);
        const alreadyHasDecimal = input.value.includes(".");
        if (!isNumberKey && !allowedKeys.includes(e.key)) {
          e.preventDefault();
        }
        // Prevent multiple decimals
        if (e.key === "." && alreadyHasDecimal) {
          e.preventDefault();
        }
      });

      // Prevent pasting non-numeric content
      input.addEventListener("paste", (e) => {
        const pasted = (e.clipboardData || window.clipboardData).getData("text");
        if (!/^\d+(\.\d+)?$/.test(pasted)) {
          e.preventDefault();
        }
      });

      // Enforce min/max on input
      input.addEventListener("input", () => {
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 100;
        let val = parseFloat(input.value);

        if (isNaN(val)) {
          input.value = "";
          return;
        }

        if (val < min) input.value = min;
        else if (val > max) input.value = max;
      });

      // Recheck limits on blur (when user exits input)
      input.addEventListener("blur", () => {
        const max = Number(input.max) || 100;
        let val = parseFloat(input.value);
        if (!isNaN(val) && val > max) {
          input.value = max;
        }
      });
    });
  }

  enforceInputLimits();

  // Listen for input changes in grade inputs to recalc totals on that row
  if (gradebookTableBody) {
    gradebookTableBody.addEventListener("input", e => {
      if (e.target.tagName.toLowerCase() === "input") {
        const row = e.target.closest("tr");
        calculateRowTotals(row);
      }
    });
  }

  // Clear all inputs and totals in the gradebook table
  function clearAllInputs() {
    if (!gradebookTableBody) return;
    const inputs = gradebookTableBody.querySelectorAll("input[type=number]");
    inputs.forEach(input => (input.value = ""));
    const totalCells = gradebookTableBody.querySelectorAll(".total-cell");
    totalCells.forEach(cell => (cell.textContent = ""));
    const percentCells = gradebookTableBody.querySelectorAll(".percent-cell");
    percentCells.forEach(cell => (cell.textContent = ""));
  }

  // Load saved data for a section from localStorage
  function loadSectionData(section) {
    console.log("Loading section data for:", section);
    if (!section || !gradebookTableBody) return;
    const key = `gradebook_${courseId}_section${section}`;
    const dataJson = localStorage.getItem(key);
    console.log("Raw data from localStorage:", dataJson);
    if (!dataJson) {
      clearAllInputs();
      console.log("No data found, inputs cleared.");

      // Show gradebook-wrapper anyway
      const gradebookWrapper = document.querySelector('.gradebook-wrapper');
      if (gradebookWrapper) {
        gradebookWrapper.style.display = 'block';
      }
      return;
    }
    const data = JSON.parse(dataJson);
    console.log("Parsed data:", data);
    const rows = gradebookTableBody.querySelectorAll("tr");
    rows.forEach((row, idx) => {
      const rowData = data[idx];
      if (!rowData) return;
      const inputs = row.querySelectorAll("input[type=number]");
      inputs.forEach((input, i) => {
        input.value = rowData[i] !== null && rowData[i] !== undefined ? rowData[i] : "";
      });
      calculateRowTotals(row);
    });

    // Show gradebook-wrapper now that data is loaded
    const gradebookWrapper = document.querySelector('.gradebook-wrapper');
    if (gradebookWrapper) {
      gradebookWrapper.style.display = 'block';
    }
  }

  // Save current grade data and roster for selected section
  function saveCurrentSection() {
    if (!sectionSelect) return;
    const section = sectionSelect.value;
    if (!section) {
      alert("กรุณาเลือกส่วนชั้นเรียนก่อนบันทึกข้อมูล");  // "Please select a section before saving."
      return;
    }
    if (!gradebookTableBody) return;

    const key = `gradebook_${courseId}_section${section}`;
    const rows = gradebookTableBody.querySelectorAll("tr");
    const allData = [];

    rows.forEach(row => {
      const inputs = row.querySelectorAll("input[type=number]");
      const rowData = [];
      inputs.forEach(input => {
        rowData.push(input.value ? Number(input.value) : null);
      });

      // Append percent cell value at the end
      const percentCell = row.querySelector(".percent-cell");
      if (percentCell) {
        const percentText = percentCell.textContent.replace('%', '');
        const percent = parseFloat(percentText);
        rowData.push(!isNaN(percent) ? percent : null);
      }
      allData.push(rowData);
    });

    // Save roster: extract student ID and name from first two <td> in each row
    const roster = [];
    rows.forEach(row => {
      const tds = row.querySelectorAll("td");
      if (tds.length >= 2) {
        const studentId = tds[0].textContent.trim();
        const name = tds[1].textContent.trim();
        if (studentId && name) roster.push({ studentId, name });
      }
    });
    const rosterKey = `gradebook_${courseId}_section${section}_roster`;

    // Show spinner during save
    if (spinnerOverlay && spinnerText) {
      spinnerText.textContent = "กำลังบันทึกข้อมูล..."; // "Saving data..."
      spinnerOverlay.classList.remove("hidden");
    }

    setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(allData));
      localStorage.setItem(rosterKey, JSON.stringify(roster));
      if (spinnerOverlay) spinnerOverlay.classList.add("hidden");
      alert("บันทึกข้อมูลเรียบร้อยแล้ว"); // "Data saved successfully"
    }, 800);
  }

  // On section change, load saved data
  if (sectionSelect) {
  sectionSelect.addEventListener("change", () => {
    const section = sectionSelect.value;
    console.log("Selected section:", section);
    loadSectionData(section);

    if (exportBtn) {
      if (section) {
        exportBtn.classList.remove("hidden");  // Show button when section selected
      } else {
        exportBtn.classList.add("hidden");     // Hide if no section selected
      }
    }
  });
}


  // Save button click
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      saveCurrentSection();
    });
  }

  // On page load clear inputs and prompt user to pick section
  clearAllInputs();
});


//  GRADEBOOK EXPORT BUTTON


document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.getAttribute("data-page-type");
  if (pageType !== "gradebook") return;  // Only run this on gradebook page

  const exportBtn = document.getElementById("exportGradeExcelBtn");
if (exportBtn) {
  exportBtn.classList.add("hidden");  // hide export button initially
}

  exportBtn.addEventListener("click", () => {
    console.log("Export button clicked");
    const courseId = document.body.dataset.courseId || "UnknownCourse";
    const sectionSelect = document.getElementById("sectionSelect");
    const sectionName = sectionSelect?.value || "UnknownSection";
    const termText = "เทอมแรก 2569";

    let table = document.querySelector("table.gradebook-table");
    if (!table) {
      alert("ไม่พบตารางคะแนน (Gradebook Table)");
      return;
    }

    // Clone table to avoid modifying the original
    const cloneTable = table.cloneNode(true);

    // Replace input fields with their values
    cloneTable.querySelectorAll("input").forEach(input => {
      const td = input.closest("td");
      if (td) {
        const span = document.createElement("span");
        span.textContent = input.value;
        td.replaceChild(span, input);
      }
    });

    // Create workbook and define worksheet with header first
    const wb = XLSX.utils.book_new();
    const headerInfo = [
      ["ภาควิชาภาษาต่างประเทศ"],
      ["คณะมนุษยศาสตร์ มหาวิทยาลัยเกษตรศาสตร์"],
      [""],  // Empty cell
      [`รายวิชา: ${courseId}, ส่วน: ${sectionName}`],
      [""],  // Empty cell before gradebook
    ];
    const ws = XLSX.utils.aoa_to_sheet(headerInfo); // Insert header info first

    // Convert table into sheet format and append data starting at A6
    const wsTable = XLSX.utils.table_to_sheet(cloneTable);
    const aoa = XLSX.utils.sheet_to_json(wsTable, { header: 1 });

// Find column index for "เปอร์เซ็นต์"
const percentColIndex = aoa[0].findIndex(col => col?.toString().includes("เปอร์เซ็นต์") || col?.toString().toLowerCase().includes("percent"));

// Convert decimals to whole numbers
if (percentColIndex !== -1) {
  for (let i = 1; i < aoa.length; i++) {
    const cellValue = aoa[i][percentColIndex];
    if (!isNaN(cellValue)) {
      aoa[i][percentColIndex] = Math.round(parseFloat(cellValue) * 100);
    }
  }
}

XLSX.utils.sheet_add_aoa(ws, aoa, { origin: "A6" });


    // Apply column width styling for readability
    ws["!cols"] = new Array(14).fill({ wch: 15 });

    // Append worksheet and generate file
    XLSX.utils.book_append_sheet(wb, ws, "Gradebook Export");
    const filename = `grades_${courseId}_${sectionName}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
  });
});









// ATTENDANCE LOGIC


document.addEventListener("DOMContentLoaded", () => {
  const pageType = document.body.getAttribute("data-page-type");
  if (pageType !== "attendance") return;

  const sectionSelect = document.getElementById("sectionSelect");
  const attendanceBody = document.getElementById("attendanceBody");
  const attendanceTable = document.querySelector(".attendance-table");
  const saveAttendanceBtn = document.getElementById("saveAttendanceBtn");
  const exportBtn = document.getElementById("exportAttendanceExcelBtn");
  const courseId = document.body.getAttribute("data-course-id");
  const TOTAL_SESSIONS = 30;

  const daySelectWrapper = document.getElementById("daySelectWrapper");
  const daySelect = document.getElementById("daySelect");
  const markAllPresentBtn = document.getElementById("markAllPresentBtn");
  const markAllAbsentBtn = document.getElementById("markAllAbsentBtn");

  if (!courseId) {
    alert("Course ID not found in <body data-course-id>");
    return;
  }

  // Export Attendance

  function exportAttendance(section) {
  const key = `attendance_${courseId}_section${section}`;
  const dataJson = localStorage.getItem(key);
  if (!dataJson) return alert("ไม่มีข้อมูลให้ export");

  const data = JSON.parse(dataJson);
  const headerInfo = [
    ["ภาควิชาภาษาต่างประเทศ"],
    ["คณะมนุษยศาสตร์ มหาวิทยาลัยเกษตรศาสตร์"],
    [""],
    [`รายวิชา: ${courseId}, ส่วน: ${section}`],
    [""]
  ];

  const attendanceHeaders = ["รหัสนักศึกษา", "ชื่อ", "ชื่อเล่น", "%"];
  for (let i = 1; i <= TOTAL_SESSIONS; i++) {
    attendanceHeaders.push(i.toString());
  }

  const rows = data.map(entry => {
    const percent = Math.round((entry.attendedArray.filter(x => x).length / TOTAL_SESSIONS) * 100) + "%";
    return [
      entry.studentId,
      entry.name,
      entry.nickname,
      percent,
      ...entry.attendedArray.map(v => (v ? "✓" : ""))
    ];
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ...headerInfo,
    attendanceHeaders,
    ...rows
  ]);

  XLSX.utils.book_append_sheet(workbook, worksheet, `Section ${section}`);
  XLSX.writeFile(workbook, `${courseId}_Attendance_Section${section}.xlsx`);
}


  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const section = sectionSelect.value;
      if (!section) {
        alert("กรุณาเลือก Section ก่อน export");
        return;
      }
      exportAttendance(section);
    });
    exportBtn.style.display = "none";
  }

  attendanceTable.style.display = "none";
  daySelectWrapper.style.display = "none";

  for (let i = 1; i <= 40; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `Section ${i}`;
    sectionSelect.appendChild(option);
  }

  function populateDaySelect() {
    daySelect.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- เลือกวัน --";
    daySelect.appendChild(defaultOption);

    for (let i = 1; i <= TOTAL_SESSIONS; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = i;
      daySelect.appendChild(option);
    }
  }

  populateDaySelect();

  function buildTableHeader() {
    const thead = attendanceTable.querySelector("thead");
    thead.innerHTML = "";
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <th data-th="รหัสนักศึกษา" data-en="Student ID">รหัสนักศึกษา</th>
      <th data-th="ชื่อ" data-en="Name">ชื่อ</th>
      <th data-th="ชื่อเล่น" data-en="Nickname">ชื่อเล่น</th>
      <th>%</th>
      ${Array.from({ length: TOTAL_SESSIONS }, (_, i) => `<th>${i + 1}</th>`).join("")}
    `;
    thead.appendChild(headerRow);
    setLanguage(document.documentElement.lang || 'th');
  }

  function loadRoster(section) {
    attendanceBody.innerHTML = "";
    const rosterKey = `gradebook_${courseId}_section${section}_roster`;
    const rosterJson = localStorage.getItem(rosterKey);

    if (!rosterJson) {
      attendanceBody.innerHTML = `<tr><td colspan="${TOTAL_SESSIONS + 4}">No roster data found for Section ${section}.</td></tr>`;
      attendanceTable.style.display = "table";
      return;
    }

    const rosterData = JSON.parse(rosterJson);
    if (!Array.isArray(rosterData) || rosterData.length === 0) {
      attendanceBody.innerHTML = `<tr><td colspan="${TOTAL_SESSIONS + 4}">No roster data found for Section ${section}.</td></tr>`;
      attendanceTable.style.display = "table";
      return;
    }

    rosterData.forEach((student) => {
      if (!student?.studentId || !student?.name) return;
      const tr = createAttendanceRow(student.studentId, student.name);
      attendanceBody.appendChild(tr);
    });

    attendanceTable.style.display = "table";
  }

  function createAttendanceRow(studentId, name) {
    const tr = document.createElement("tr");

    const idTd = document.createElement("td");
    idTd.textContent = studentId;

    const nameTd = document.createElement("td");
    nameTd.textContent = name;

    const nickTd = document.createElement("td");
    const nickInput = document.createElement("input");
    nickInput.type = "text";
    nickInput.className = "nickname";
    nickInput.placeholder = "(ใส่ชื่อเล่น)";
    nickInput.style.width = "100px";
    nickInput.maxLength = 20;
    nickInput.addEventListener("input", () => {
      let cleaned = nickInput.value.replace(/[^a-zA-Zก-๙\s]/g, "").replace(/^\s+/, "");
      if (cleaned !== nickInput.value) nickInput.value = cleaned;
    });
    nickTd.appendChild(nickInput);

    const percentTd = document.createElement("td");
    percentTd.className = "percent";

    const checkboxTds = [];
    for (let i = 1; i <= TOTAL_SESSIONS; i++) {
      const td = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.className = "attendance-checkbox";
      checkbox.dataset.session = i;
      td.appendChild(checkbox);
      checkboxTds.push(td);

      checkbox.addEventListener("change", () => {
        const checkedCount = tr.querySelectorAll("input.attendance-checkbox:checked").length;
        percentTd.textContent = Math.round((checkedCount / TOTAL_SESSIONS) * 100) + "%";
      });
    }

    [idTd, nameTd, nickTd, percentTd, ...checkboxTds].forEach(td => tr.appendChild(td));
    checkboxTds[0].querySelector("input").dispatchEvent(new Event("change"));
    return tr;
  }

  function loadAttendance(section) {
    const key = `attendance_${courseId}_section${section}`;
    const dataJson = localStorage.getItem(key);
    if (!dataJson) return;

    const attendanceData = JSON.parse(dataJson);
    const trs = attendanceBody.querySelectorAll("tr");

    trs.forEach((tr, i) => {
      const nickInput = tr.querySelector("input.nickname");
      const checkboxes = Array.from(tr.querySelectorAll("input.attendance-checkbox"));
      const record = attendanceData[i];
      if (!record) return;

      nickInput.value = record.nickname || "";
      record.attendedArray?.forEach((val, idx) => {
        if (checkboxes[idx]) checkboxes[idx].checked = !!val;
      });
      checkboxes[0]?.dispatchEvent(new Event("change"));
    });
  }

  function saveAttendance(section) {
    const key = `attendance_${courseId}_section${section}`;
    const trs = attendanceBody.querySelectorAll("tr");
    const data = [];

    trs.forEach(tr => {
      const studentId = tr.children[0].textContent;
      const name = tr.children[1].textContent;
      const nickInput = tr.querySelector("input.nickname");
      const checkboxes = Array.from(tr.querySelectorAll("input.attendance-checkbox"));
      const attendedArray = checkboxes.map(cb => cb.checked ? 1 : 0);
      data.push({ studentId, name, nickname: nickInput.value.trim(), attendedArray });
    });

    localStorage.setItem(key, JSON.stringify(data));
    alert("บันทึกข้อมูลการเข้าเรียนเรียบร้อยแล้ว");
  }

  sectionSelect.addEventListener("change", () => {
    const section = sectionSelect.value;
    if (!section) {
      attendanceTable.style.display = "none";
      attendanceBody.innerHTML = "";
      daySelectWrapper.style.display = "none";
      if (exportBtn) exportBtn.style.display = "none";
      return;
    }
    buildTableHeader();
    loadRoster(section);
    loadAttendance(section);
    daySelectWrapper.style.display = "inline-block";
    if (exportBtn) exportBtn.style.display = "inline-block";
  });

  if (saveAttendanceBtn) {
    saveAttendanceBtn.addEventListener("click", () => {
      const section = sectionSelect.value;
      if (!section) {
        alert("กรุณาเลือกส่วนชั้นเรียนก่อนบันทึกข้อมูล");
        return;
      }
      saveAttendance(section);
    });
  }

  if (markAllPresentBtn) {
    markAllPresentBtn.addEventListener("click", () => {
      const day = daySelect.value;
      if (!day) return alert("กรุณาเลือกวันที่ก่อนมาร์ค");
      attendanceBody.querySelectorAll("tr").forEach(tr => {
        const checkbox = tr.querySelector(`input.attendance-checkbox[data-session="${day}"]`);
        if (checkbox) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event("change"));
        }
      });
      alert(`มาร์ควันที่ ${day} ว่านักเรียนเข้าเรียนทั้งหมดแล้ว`);
    });
  }

  if (markAllAbsentBtn) {
    markAllAbsentBtn.addEventListener("click", () => {
      const day = daySelect.value;
      if (!day) return alert("กรุณาเลือกวันที่ก่อนมาร์ค");
      attendanceBody.querySelectorAll("tr").forEach(tr => {
        const checkbox = tr.querySelector(`input.attendance-checkbox[data-session="${day}"]`);
        if (checkbox) {
          checkbox.checked = false;
          checkbox.dispatchEvent(new Event("change"));
        }
      });
      alert(`มาร์ควันที่ ${day} ว่านักเรียนขาดเรียนทั้งหมดแล้ว`);
    });
  }
});











  // TALLY LOGIC


document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const courseId = body.dataset.courseId;
  const sectionSelect = document.getElementById("sectionSelect");
  const percentBody    = document.getElementById("percentBody");
  const tallyBody      = document.getElementById("tallyBody");
  const percentTable   = document.getElementById("percentTable");
  const tallyTable     = document.getElementById("tallyTable");
  const exportBtn      = document.getElementById("exportTallyExcelBtn");
  const exportAllBtn   = document.getElementById("exportAllTallyExcelBtn");
  const exportWrapper  = document.querySelector(".export-tally-button-wrapper");
  const allTallyTable  = document.getElementById("allTallyTable");

  // Hide the allTallyTable initially
  if (allTallyTable) {
    allTallyTable.style.display = "none";
  }

  if (percentTable?.querySelector("thead")) percentTable.querySelector("thead").style.display = "none";
  if (tallyTable?.querySelector("thead"))   tallyTable.querySelector("thead").style.display = "none";
  exportWrapper?.classList.remove("visible");

  if (sectionSelect && courseId) {
    const sectionSet = new Set();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const prefix = `gradebook_${courseId}_section`;
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        const match = rest.match(/^([^_]+)/);
        if (match && match[1]) sectionSet.add(match[1]);
      }
    }

    const sections = Array.from(sectionSet);
    sections.sort((a, b) => {
      const na = Number(a), nb = Number(b);
      return (!isNaN(na) && !isNaN(nb)) ? na - nb : a.localeCompare(b);
    });

    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "Select Section";
    sectionSelect.appendChild(emptyOpt);

    sections.forEach(sec => {
      const option = document.createElement("option");
      option.value = sec;
      option.textContent = `Section ${sec}`;
      sectionSelect.appendChild(option);
    });

    sectionSelect.addEventListener("change", () => {
  const section = sectionSelect.value;

  if (!section) {
    percentBody.innerHTML = "";
    tallyBody.innerHTML = "";
    percentTable.style.display = "none";
    tallyTable.style.display = "none";
    allTallyTable.style.display = "none";
    percentTable?.querySelector("thead")?.style.setProperty("display", "none");
    tallyTable?.querySelector("thead")?.style.setProperty("display", "none");
    window.tallyChartInstance?.destroy();
    exportWrapper?.classList.remove("visible");

    // 🔽 Hide the header when no section selected
    const allTallyHeader = document.getElementById("allTallyHeader");
    if (allTallyHeader) {
      allTallyHeader.classList.add("hidden");
    }

    return;
  }

  percentTable.style.display = "table";
  tallyTable.style.display = "table";
  allTallyTable.style.display = "table";
  percentTable.querySelector("thead").style.display = "table-header-group";
  tallyTable.querySelector("thead").style.display = "table-header-group";

  // 🔽 Show the header when section is selected
  const allTallyHeader = document.getElementById("allTallyHeader");
  if (allTallyHeader) {
    allTallyHeader.classList.remove("hidden");
  }

  loadAndDisplayData(courseId, section);
  exportWrapper?.classList.add("visible");
});

  }

  function loadAndDisplayData(courseId, section) {
    const keyData = `gradebook_${courseId}_section${section}`;
    const keyRoster = `gradebook_${courseId}_section${section}_roster`;
    const gbJson = localStorage.getItem(keyData);
    const rosterJson = localStorage.getItem(keyRoster);

    if (!gbJson || !rosterJson) {
      percentBody.innerHTML = `<tr><td colspan="3">ไม่มีข้อมูลสำหรับ Section นี้</td></tr>`;
      tallyBody.innerHTML = "";
      window.tallyChartInstance?.destroy();
      return;
    }

    const gradebookData = JSON.parse(gbJson);
    const rosterData = JSON.parse(rosterJson);

    percentBody.innerHTML = "";
    rosterData.forEach((stu, i) => {
  const row = gradebookData[i] || [];
  const raw = row.at(-1);
  let pct = (typeof raw === "number" && !isNaN(raw)) ? Math.round(raw) + "%" : "-";

  const tr = document.createElement("tr");
  if (i % 2 === 0) {
    tr.classList.add("row-even");
  } else {
    tr.classList.add("row-odd");
  }

  tr.innerHTML = `
    <td>${stu.studentId}</td>
    <td>${stu.name}</td>
    <td>${pct}</td>`;

  percentBody.appendChild(tr);
});


    // tally calculation
    const tallyCounts = {};
    gradebookData.forEach((row, i) => {
      const raw = row.at(-1);
      if (typeof raw === "number" && !isNaN(raw) && raw !== null) {
        const pct = Math.round(raw);
        tallyCounts[pct] = (tallyCounts[pct] || 0) + 1;
      }
    });

    const sorted = Object.keys(tallyCounts).map(Number).sort((a, b) => b - a);
    tallyBody.innerHTML = "";
    sorted.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${p}%</td><td>${tallyCounts[p]}</td>`;
      tallyBody.appendChild(tr);
    });
  }

  function loadAndDisplayAllTally(courseId) {
    const allTallyBody = document.getElementById("allTallyBody");
    if (!allTallyBody || !sectionSelect) return;

    const tallyCounts = {};
    const processedEntries = new Set();  // Tracks unique student entries
    const sections = Array.from(sectionSelect.options).map(o => o.value).filter(v => v);

    sections.forEach(section => {
      const keyData = `gradebook_${courseId}_section${section}`;
      const gbJson = localStorage.getItem(keyData);
      if (!gbJson) return;

      const gradebookData = JSON.parse(gbJson);

      gradebookData.forEach((row, index) => {
        const raw = row.at(-1);
        if (typeof raw === "number" && !isNaN(raw)) {
          const pct = Math.round(raw);

          // Ensure we only count unique rows, avoiding duplicates
          const uniqueKey = `${section}-${index}`;
          if (!processedEntries.has(uniqueKey)) {
            tallyCounts[pct] = (tallyCounts[pct] || 0) + 1;
            processedEntries.add(uniqueKey);
          }
        }
      });
    });

    const sortedScores = Object.keys(tallyCounts).map(Number).sort((a, b) => b - a);
    allTallyBody.innerHTML = "";
    sortedScores.forEach(score => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${score}%</td><td>${tallyCounts[score]}</td>`;
      allTallyBody.appendChild(tr);
    });

    if (sortedScores.length === 0) {
      allTallyBody.innerHTML = `<tr><td colspan="2">ไม่มีข้อมูลสำหรับทุก Section</td></tr>`;
    }
  }

  if (courseId) {
    loadAndDisplayAllTally(courseId);
  }

  // Export current section data
  exportBtn?.addEventListener("click", () => {
    if (!percentTable || !tallyTable) return alert("Tables not found");
    const section = sectionSelect.value || "N/A";

    function tableToArray(table) {
      const arr = [];
      const ths = table.querySelectorAll("thead tr th");
      if (ths.length) arr.push(Array.from(ths).map(th => th.textContent.trim()));
      table.querySelectorAll("tbody tr").forEach(tr => {
        arr.push(Array.from(tr.querySelectorAll("td")).map(td => td.textContent.trim()));
      });
      return arr;
    }

    const headerInfo = [
      ["ภาควิชาภาษาต่างประเทศ"],
      ["คณะมนุษยศาสตร์ มหาวิทยาลัยเกษตรศาสตร์"],
      [""],
      [`รายวิชา: ${courseId}`, `Section: ${section}`],
      [""]
    ];

    const wb = XLSX.utils.book_new();
    const percentArr = tableToArray(percentTable);
    const wsPercent = XLSX.utils.aoa_to_sheet([...headerInfo, ...percentArr]);
    wsPercent['!cols'] = [{wch:15},{wch:30},{wch:10}];

    const tallyArr = tableToArray(tallyTable);
    const wsTally = XLSX.utils.aoa_to_sheet([...headerInfo, ...tallyArr]);
    wsTally['!cols'] = [{wch:10},{wch:20}];

    XLSX.utils.book_append_sheet(wb, wsPercent, "Percent Data");
    XLSX.utils.book_append_sheet(wb, wsTally, "Tally Data");
    XLSX.writeFile(wb, `${courseId}_Tally_Section${section}_${Date.now()}.xlsx`);
  });

  // Export all tally data from the allTallyTable element
  exportAllBtn?.addEventListener("click", () => {
    if (!allTallyTable) return alert("All Tally Table not found");

    function tableToArray(table) {
      const arr = [];
      const ths = table.querySelectorAll("thead tr th");
      if (ths.length) arr.push(Array.from(ths).map(th => th.textContent.trim()));
      table.querySelectorAll("tbody tr").forEach(tr => {
        arr.push(Array.from(tr.querySelectorAll("td")).map(td => td.textContent.trim()));
      });
      return arr;
    }

    const headerInfo = [
      ["ภาควิชาภาษาต่างประเทศ"],
      ["คณะมนุษยศาสตร์ มหาวิทยาลัยเกษตรศาสตร์"],
      [""],
      [`รายวิชา: ${courseId}`, "รวมทุกส่วน"],
      [""]
    ];

    const wb = XLSX.utils.book_new();
    const allTallyArr = tableToArray(allTallyTable);
    const wsAllTally = XLSX.utils.aoa_to_sheet([...headerInfo, ...allTallyArr]);
    wsAllTally['!cols'] = [{wch: 15}, {wch: 25}];

    XLSX.utils.book_append_sheet(wb, wsAllTally, "All Sections Tally");
    XLSX.writeFile(wb, `${courseId}_AllSections_Tally_${Date.now()}.xlsx`);
  });
});





















// Statistics Logic



document.addEventListener("DOMContentLoaded", () => {
  const sectionSelect = document.getElementById("sectionSelect");
  const statisticsContainer = document.getElementById("statisticsContainer");
  const statisticsBox = document.getElementById("statisticsBox");
  const attendanceBox = document.getElementById("attendance-statistics-box");
  const courseId = document.body.dataset.courseId || "UnknownCourse";

  const gradeRanges = [
    { label: "95-100", min: 95, max: 100 },
    { label: "90-94", min: 90, max: 94 },
    { label: "85-89", min: 85, max: 89 },
    { label: "80-84", min: 80, max: 84 },
    { label: "75-79", min: 75, max: 79 },
    { label: "70-74", min: 70, max: 74 },
    { label: "65-69", min: 65, max: 69 },
    { label: "60-64", min: 60, max: 64 },
    { label: "Below 60", min: 0, max: 59 },
  ];

  const coursesConfig = {
    ENG202: [
      { name: "Assignment 1", maxPoints: 10 },
      { name: "Assignment 2", maxPoints: 10 },
      { name: "Assignment 3", maxPoints: 10 },
      { name: "Midterm Exam", maxPoints: 65 },
      { name: "Assignment 4", maxPoints: 10 },
      { name: "Assignment 5", maxPoints: 10 },
      { name: "Assignment 6", maxPoints: 10 },
      { name: "Final Exam", maxPoints: 65 },
      { name: "Participation", maxPoints: 10 },
    ],

    ENG204: [
      { name: "Assignment 1", maxPoints: 10 },
      { name: "Assignment 2", maxPoints: 10 },
      { name: "Midterm Exam", maxPoints: 50 },
      { name: "Assignment 3", maxPoints: 10 },
      { name: "Assignment 4", maxPoints: 10 },
      { name: "Final Exam", maxPoints: 50 },
      { name: "Attendance", maxPoints: 10 },
      { name: "Participation", maxPoints: 10 },
    ],

    ENG103: [
      { name: "Assignment 1", maxPoints: 25 },
      { name: "Assignment 2", maxPoints: 25 },
      { name: "Presentation", maxPoints: 100 },
      { name: "Assignment 3", maxPoints: 50 },
      { name: "Assignment 4", maxPoints: 50 },
      { name: "Group Project", maxPoints: 100 },
      { name: "Final Exam", maxPoints: 100 },
      { name: "Attendance", maxPoints: 10 },
    ],

    ENG321: [
      { name: "Speech 1", maxPoints: 100 },
      { name: "Speech 2", maxPoints: 100 },
      { name: "Speech 3", maxPoints: 100 },
      { name: "Speech 4", maxPoints: 100 },
      { name: "Speech 5", maxPoints: 100 },
      { name: "Attendance", maxPoints: 10 },
    ],

    ENG345: [
      { name: "Assignment 1", maxPoints: 10 },
      { name: "Assignment 2", maxPoints: 10 },
      { name: "Assignment 3", maxPoints: 10 },
      { name: "Midterm Exam", maxPoints: 65 },
      { name: "Assignment 4", maxPoints: 10 },
      { name: "Assignment 5", maxPoints: 10 },
      { name: "Assignment 6", maxPoints: 10 },
      { name: "Final Exam", maxPoints: 65 },
      { name: "Participation", maxPoints: 10 },
    ],
    // Add other courses here if needed
  };

  function calculateStats(data) {
    if (!Array.isArray(data) || data.length === 0) return {};
    const courseAssignments = coursesConfig[courseId];
    if (!courseAssignments) {
      alert(`No assignment config found for course ${courseId}`);
      return {};
    }

    const assignmentStats = {};

    courseAssignments.forEach((assignment, i) => {
      const scores = data
        .map((row) => {
          const val = Number(row[i]);
          return isNaN(val) ? null : val;
        })
        .filter((score) => score !== null);

      const percentages = scores.map((score) => {
        const pct = (score / assignment.maxPoints) * 100;
        return pct > 100 ? 100 : pct;
      });

      const distribution = {};
      gradeRanges.forEach((range) => {
        distribution[range.label] = percentages.filter((pct) => {
          if (range.label === "95-100") {
            return pct >= range.min && pct <= range.max;
          } else {
            return pct >= range.min && pct < range.max;
          }
        }).length;
      });

      assignmentStats[assignment.name] = distribution;
    });

    return assignmentStats;
  }

  function renderPieCharts(stats, gradebookData, section) {
    if (!stats || !statisticsContainer) return;
    statisticsContainer.innerHTML = "";

    const colors = [
      "#00441b", "#238b45", "#66c2a4", "#d9f0a3", "#ffffcc",
      "#fdae61", "#f46d43", "#d7301f", "#7f0000",
    ];

    Object.entries(stats).forEach(([assignment, ranges]) => {
      const chartWrapper = document.createElement("div");
      Object.assign(chartWrapper.style, {
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "12px",
        width: "220px",
        minHeight: "280px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        backgroundColor: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        margin: "8px",
        boxSizing: "border-box",
      });

      const title = document.createElement("h3");
      title.textContent = assignment;
      Object.assign(title.style, {
        fontWeight: "600",
        marginBottom: "8px",
        fontSize: "14px",
        textAlign: "center",
      });

      const canvasContainer = document.createElement("div");
      Object.assign(canvasContainer.style, {
        width: "180px",
        height: "180px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: "8px",
      });

      const canvas = document.createElement("canvas");
      canvas.width = 180;
      canvas.height = 180;

      canvasContainer.appendChild(canvas);
      chartWrapper.appendChild(title);
      chartWrapper.appendChild(canvasContainer);

      const legend = document.createElement("div");
      Object.assign(legend.style, {
        marginTop: "8px",
        fontSize: "11px",
        width: "100%",
        maxHeight: "70px",
        overflowY: "auto",
        borderTop: "1px solid #ddd",
        paddingTop: "6px",
      });

      gradeRanges.forEach((range, i) => {
        const count = ranges[range.label] || 0;
        const item = document.createElement("div");
        Object.assign(item.style, {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2px",
        });

        const colorBox = document.createElement("span");
        Object.assign(colorBox.style, {
          backgroundColor: colors[i],
          display: "inline-block",
          width: "12px",
          height: "12px",
          marginRight: "6px",
          borderRadius: "2px",
        });

        const label = document.createElement("span");
        label.textContent = range.label;

        const countSpan = document.createElement("span");
        countSpan.textContent = count;

        const flexContainer = document.createElement("div");
        Object.assign(flexContainer.style, {
          display: "flex",
          justifyContent: "space-between",
          flexGrow: "1",
          minWidth: "120px",
        });
        flexContainer.appendChild(label);
        flexContainer.appendChild(countSpan);

        item.appendChild(colorBox);
        item.appendChild(flexContainer);

        legend.appendChild(item);
      });

      chartWrapper.appendChild(legend);
      statisticsContainer.appendChild(chartWrapper);

      new Chart(canvas, {
        type: "pie",
        data: {
          labels: gradeRanges.map((range) => range.label),
          datasets: [{
            data: gradeRanges.map((range) => ranges[range.label] || 0),
            backgroundColor: colors,
          }],
        },
        options: {
          responsive: false,
          plugins: {
            legend: { display: false },
            title: { display: false },
          },
        },
      });
    });
  }

  function renderAttendanceLineGraph(attendanceData) {
    const canvas = document.getElementById("attendanceLineChart");
    if (!canvas) return;

    if (window.attendanceChart) window.attendanceChart.destroy();

    const dayCount = Math.max(...attendanceData.map(s => s.attendedArray.length));
    const labels = Array.from({ length: dayCount }, (_, i) => `วันที่ ${i + 1}`);
    const attendanceCounts = Array(dayCount).fill(0);

    attendanceData.forEach(student => {
      for (let day = 0; day < dayCount; day++) {
        if (student.attendedArray[day] === 1) {
          attendanceCounts[day]++;
        }
      }
    });

    window.attendanceChart = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: attendanceCounts,
          fill: false,
          borderColor: "#0e6962",
          backgroundColor: "#0e6962",
          tension: 0.3,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: "จำนวนผู้เข้าประชุมรายวัน" },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            title: { display: true, text: "นักศึกษามาเรียน" },
          },
        },
      },
    });
  }

  async function loadStatistics(section) {
    if (!section) return;
    window.showSpinner?.("loading");

    const gradebookKey = `gradebook_${courseId}_section${section}`;
    const attendanceKey = `attendance_${courseId}_section${section}`;

    const rawGradebook = localStorage.getItem(gradebookKey);
    const rawAttendance = localStorage.getItem(attendanceKey);

    if (!rawGradebook) {
      window.hideSpinner?.();
      alert("No data found for the selected section.");
      statisticsContainer.innerHTML = "";
      if (attendanceBox) attendanceBox.style.display = "none";
      return;
    }

    let parsedGradebook, parsedAttendance;
    try {
      parsedGradebook = JSON.parse(rawGradebook);
      parsedAttendance = rawAttendance ? JSON.parse(rawAttendance) : null;
    } catch {
      window.hideSpinner?.();
      alert("Data corrupted or invalid JSON.");
      statisticsContainer.innerHTML = "";
      if (attendanceBox) attendanceBox.style.display = "none";
      return;
    }

    const stats = calculateStats(parsedGradebook);
    renderPieCharts(stats, parsedGradebook, section);
    statisticsBox.style.display = "block";

    window.hideSpinner?.();

    if (parsedAttendance) {
      renderAttendanceLineGraph(parsedAttendance);
      attendanceBox.style.display = "block";
    } else {
      console.warn("No attendance data found for this section.");
      attendanceBox.style.display = "none";
    }
  }

  sectionSelect?.addEventListener("change", () => {
    statisticsBox.style.display = "none";
    attendanceBox.style.display = "none";
    loadStatistics(sectionSelect.value);
  });

  if (sectionSelect && sectionSelect.value) {
    loadStatistics(sectionSelect.value);
  }

  // NAV LINK HANDLERS
  document.querySelectorAll("a.nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href && href.endsWith(".html")) {
        e.preventDefault();
        window.showSpinner?.("loading");
        setTimeout(() => {
          window.location.href = href;
        }, 400);
      }
    });
  });

  // LANGUAGE TOGGLE
  document.querySelectorAll(".lang-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      window.currentLang = lang; // <-- Store globally
      document.querySelectorAll("[data-en], [data-th]").forEach(el => {
        el.textContent = el.dataset[lang] || el.textContent;
      });
      document.querySelectorAll(".lang-toggle").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
  window.currentLang = "th";

});

document.addEventListener("DOMContentLoaded", () => {
  const courseId = document.body.dataset.courseId || "ENG202";
  const sectionSelect = document.getElementById("sectionSelect");

  // Load and draw chart for initial section if available
  if (sectionSelect && sectionSelect.value) {
    loadAndDrawTallyChart(courseId, sectionSelect.value);
  }

  // Update chart when section changes
  if (sectionSelect) {
    sectionSelect.addEventListener("change", () => {
      const section = sectionSelect.value;
      if (section) {
        loadAndDrawTallyChart(courseId, section);
      } else if (window.tallyChartInstance) {
        window.tallyChartInstance.destroy();
        window.tallyChartInstance = null;
      }
    });
  }
});

function loadAndDrawTallyChart(courseId, section) {
  const gradebookKey = `gradebook_${courseId}_section${section}`;

  const gradebookJson = localStorage.getItem(gradebookKey);

  if (!gradebookJson) {
    if (window.tallyChartInstance) {
      window.tallyChartInstance.destroy();
      window.tallyChartInstance = null;
    }
    document.getElementById("tallyBarChartContainer").style.display = "none";  // Hide container if no data
    return;
  }

  const gradebookData = JSON.parse(gradebookJson);

  const tallyCounts = {};
  for (const row of gradebookData) {
    const percent = row[row.length - 1];
    if (percent !== null && percent !== undefined) {
      const rounded = Math.round(percent);
      tallyCounts[rounded] = (tallyCounts[rounded] || 0) + 1;
    }
  }

  const sortedPercents = Object.keys(tallyCounts)
    .map(Number)
    .sort((a, b) => b - a);

  const labels = sortedPercents.map(p => p + "%");
  const dataCounts = sortedPercents.map(p => tallyCounts[p]);

  document.getElementById("tallyBarChartContainer").style.display = "block";  // SHOW container when chart draws

  drawTallyChart(labels, dataCounts);
}


function drawTallyChart(labels, dataCounts) {
  const canvas = document.getElementById("tallyBarChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (window.tallyChartInstance) {
    window.tallyChartInstance.destroy();
  }

  const barColors = [
    "rgba(0, 128, 0, 0.7)",
    "rgba(102, 205, 0, 0.7)",
    "rgba(255, 215, 0, 0.7)",
    "rgba(255, 165, 0, 0.7)",
    "rgba(255, 99, 71, 0.7)",
    "rgba(178, 34, 34, 0.7)"
  ];

  const lang = window.currentLang || 'th';
  const chartText = {
    th: {
      label: "จำนวนนักศึกษา",
      yAxis: "จำนวนนักเรียน",
      xAxis: "เปอร์เซ็นต์รวมปัจจุบัน",
      title: "จำนวนผู้เข้าประชุมรายวัน",
    },
    en: {
      label: "Number of Students",
      yAxis: "Student Count",
      xAxis: "Overall Percentage",
      title: "Daily Attendance Count",
    }
  };

  

  const shadowPlugin = {
    id: 'barShadow',
    beforeDraw: (chart) => {
      const ctx = chart.ctx;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    },
    afterDraw: (chart) => {
      chart.ctx.restore();
    }
  };

  window.tallyChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: chartText[lang].label,
        data: dataCounts,
        backgroundColor: barColors.slice(0, dataCounts.length),
        borderColor: barColors.slice(0, dataCounts.length).map(c => c.replace("0.7", "1")),
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          title: {
            display: true,
            text: chartText[lang].yAxis,
            font: { size: 14, weight: 'bold' }
          }
        },
        x: {
          title: {
            display: true,
            text: chartText[lang].xAxis,
            font: { size: 14, weight: 'bold' }
          }
        }
      },
      plugins: {
        legend: { display: false }
      }
    },
    plugins: [shadowPlugin]
  });
}



// EXPORT STATISTICS BUTTON


document.getElementById("exportStatisticsExcelBtn").addEventListener("click", () => {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert("jsPDF library not loaded.");
    return;
  }

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const marginTop = 20;
  const marginBottom = 20;
  const usableWidth = pageWidth - marginLeft - marginRight;

  let currentY = marginTop;

  // Header text: Course + Section
  const courseId = document.body.dataset.courseId || "UnknownCourse";
  const sectionSelect = document.getElementById("sectionSelect");
  const sectionOption = sectionSelect?.options[sectionSelect.selectedIndex];
  const sectionName = sectionOption?.getAttribute("data-en") || sectionOption?.text || "Unknown Section";

  const headerText = `${courseId} (${sectionName})`;

  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  const headerX = (pageWidth - pdf.getTextWidth(headerText)) / 2;
  pdf.text(headerText, headerX, currentY);
  currentY += 10;

  const subheaderText = "Assignments and Exams";
pdf.setFontSize(14);
pdf.setFont("helvetica", "bold");
const subheaderX = (pageWidth - pdf.getTextWidth(subheaderText)) / 2;
pdf.text(subheaderText, subheaderX, currentY);
currentY += 10;

  const container = document.getElementById("statisticsContainer");
  if (!container) {
    alert("Statistics container not found.");
    return;
  }

  const attendanceId = "attendance-statistics-box";
  const tallyId = "tally-statistics-box";

  // Filter pie chart divs, excluding attendance and tally
  const pieCharts = Array.from(container.children).filter(div => {
    return div.id !== attendanceId && div.id !== tallyId;
  });

  const maxPieChartsPerPage = 6;
  const chartsToRender = pieCharts;
  const chartsPerRow = 3;
  const horizontalGap = 8;
  const verticalGap = 12;

  const availableWidth = usableWidth - (chartsPerRow - 1) * horizontalGap;
  const chartBoxWidth = availableWidth / chartsPerRow;
  const chartBoxHeight = 90;

  let posX = marginLeft;
  let posY = currentY;

  for (let i = 0; i < chartsToRender.length; i++) {
    if (i > 0 && i % maxPieChartsPerPage === 0) {
      pdf.addPage();
      posY = marginTop;
      posX = marginLeft;
    }

    if (posY + chartBoxHeight > pageHeight - marginBottom) {
      pdf.addPage();
      posY = marginTop;
      posX = marginLeft;
    }

    const chartDiv = chartsToRender[i];

    const titleElement = chartDiv.querySelector("h2, h3");
    const title = titleElement ? titleElement.textContent.trim() : `Chart ${i + 1}`;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0);
    pdf.text(title, posX, posY + 12);

    const canvas = chartDiv.querySelector("canvas");
    if (!canvas) {
      // Move to next position even if no canvas found
      posX += chartBoxWidth + horizontalGap;
      if ((i + 1) % chartsPerRow === 0) {
        posX = marginLeft;
        posY += chartBoxHeight + verticalGap;
      }
      continue;
    }

    const imgData = canvas.toDataURL("image/png");

    const aspectRatio = canvas.height / canvas.width;
    let imgWidth = chartBoxWidth * 0.9;
    let imgHeight = imgWidth * aspectRatio;

    const maxImgHeight = chartBoxHeight - 35;
    if (imgHeight > maxImgHeight) {
      imgHeight = maxImgHeight;
      imgWidth = imgHeight / aspectRatio;
    }

    const imgX = posX + (chartBoxWidth - imgWidth) / 2;
    const imgY = posY + 18;

    pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth, imgHeight);

    // Legend details
    const legendItems = [
      { color: "#00441b", label: "95-100" },
      { color: "#238b45", label: "90-94" },
      { color: "#66c2a4", label: "85-89" },
      { color: "#d9f0a3", label: "80-84" },
      { color: "#ffffcc", label: "75-79" },
      { color: "#fdae61", label: "70-74" },
      { color: "#f46d43", label: "65-69" },
      { color: "#d7301f", label: "60-64" },
      { color: "#7f0000", label: "< 60" },
    ];

    // Get data counts from Chart instance safely
    const chartInstance = Chart.getChart ? Chart.getChart(canvas) : null;
    let bracketCounts = [];
    if (chartInstance?.data?.datasets?.length) {
      bracketCounts = chartInstance.data.datasets[0].data;
    }

    const legendBoxSize = 3;
    const legendGapY = 1;
    const legendX = posX + 5;
    let legendY = imgY + imgHeight + 5;

    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0);

    for (let j = 0; j < legendItems.length; j++) {
      const item = legendItems[j];
      const count = bracketCounts[j] ?? 0;

      const countText = `${count} -`;
      const countWidth = pdf.getTextWidth(countText);
      const spacing = 2;

      // Draw count and dash
      pdf.text(countText, legendX, legendY - 1);

      // Draw colored box
      const boxX = legendX + countWidth + spacing;
      pdf.setFillColor(item.color);
      pdf.rect(boxX, legendY - legendBoxSize, legendBoxSize, legendBoxSize, "F");

      // Draw score range label
      pdf.text(item.label, boxX + legendBoxSize + spacing, legendY - 1);

      legendY += legendBoxSize + legendGapY;
    }

    if ((i + 1) % chartsPerRow === 0) {
      posX = marginLeft;
      posY += chartBoxHeight + verticalGap + 6;
    } else {
      posX += chartBoxWidth + horizontalGap;
    }
  }

  // Add attendance chart on a new page
  const attendanceBox = document.getElementById(attendanceId);
  if (attendanceBox) {
    pdf.addPage();

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");

    const attendanceTitle = "Attendance";
    const attendanceTitleX = (pageWidth - pdf.getTextWidth(attendanceTitle)) / 2;
    pdf.text(headerText, headerX, marginTop);
    pdf.text(attendanceTitle, attendanceTitleX, marginTop + 10);

    const attendanceCanvas = attendanceBox.querySelector("canvas");
    if (attendanceCanvas) {
      const attendanceImgData = attendanceCanvas.toDataURL("image/png");

      const attendanceAspectRatio = attendanceCanvas.height / attendanceCanvas.width;
      const attendanceImgWidth = usableWidth * 0.9;
      const attendanceImgHeight = attendanceImgWidth * attendanceAspectRatio;
      const attendanceImgX = marginLeft + (usableWidth - attendanceImgWidth) / 2;
      const attendanceImgY = marginTop + 20;

      pdf.addImage(attendanceImgData, "PNG", attendanceImgX, attendanceImgY, attendanceImgWidth, attendanceImgHeight);
    }
  }

  const tallyBox = document.getElementById("tallyBarChartContainer");

if (tallyBox) {
  pdf.addPage();
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");

  // Fetch course and section
const courseId = document.body.dataset.courseId || "UnknownCourse";
const sectionOption = document.getElementById("sectionSelect")?.selectedOptions[0];
const sectionName = sectionOption?.getAttribute("data-en") || sectionOption?.text || "Unknown Section";

// Header: Course (Section)
const tallyHeaderText = `${courseId} (${sectionName})`;
pdf.setFontSize(16);
pdf.setFont("helvetica", "bold");
const tallyHeaderX = (pageWidth - pdf.getTextWidth(tallyHeaderText)) / 2;
pdf.text(tallyHeaderText, tallyHeaderX, marginTop);

// Subheader: Tally
const tallySubheaderText = "Tally";
pdf.setFontSize(14);
pdf.setFont("helvetica", "bold");
const tallySubheaderX = (pageWidth - pdf.getTextWidth(tallySubheaderText)) / 2;
pdf.text(tallySubheaderText, tallySubheaderX, marginTop + 10);


  const tallyCanvas = tallyBox.querySelector("canvas");

  if (tallyCanvas) {
    const tallyImgData = tallyCanvas.toDataURL("image/png");
    const tallyAspectRatio = tallyCanvas.height / tallyCanvas.width;
    const tallyImgWidth = usableWidth * 0.9;
    const tallyImgHeight = tallyImgWidth * tallyAspectRatio;
    const tallyImgX = marginLeft + (usableWidth - tallyImgWidth) / 2;
    const tallyImgY = marginTop + 20;

    pdf.addImage(tallyImgData, "PNG", tallyImgX, tallyImgY, tallyImgWidth, tallyImgHeight);
  }
}


  // Finally save the PDF
  pdf.save(`${courseId}_${sectionName}_Statistics.pdf`);
});
























