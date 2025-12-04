// frontend/main.js

const API_BASE = ''; // same origin

// --- UI Helpers ---
function showLoading(element, isLoading, originalText = '') {
  if (isLoading) {
    element.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
    element.disabled = true;
  } else {
    element.innerHTML = originalText;
    element.disabled = false;
  }
}

function showResult(element, text, isError = false) {
  element.classList.remove('hidden');
  element.style.borderColor = isError ? 'var(--status-bad)' : 'var(--accent)';
  element.innerHTML = text;
}

// --- Tabs logic ---
document.querySelectorAll('.tab-button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');

    // Toggle Buttons
    document.querySelectorAll('.tab-button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    // Toggle Content
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    document.getElementById(`tab-${target}`).classList.add('active');
  });
});

// --- Create Evidence ---
const createForm = document.getElementById('create-form');
const createResultEl = document.getElementById('create-result');
const submitBtn = createForm.querySelector('button[type="submit"]');

createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const originalBtnText = submitBtn.innerHTML;
  showLoading(submitBtn, true);
  createResultEl.classList.add('hidden');

  const formData = new FormData(createForm);

  try {
    const res = await fetch(`${API_BASE}/api/evidence`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      showResult(createResultEl, `Error: ${data.error || 'Unknown error'}<br>${data.details || ''}`, true);
    } else {
      showResult(createResultEl, '<strong>✅ Evidence created successfully:</strong>\n' + JSON.stringify(data, null, 2));
      createForm.reset();
    }
  } catch (err) {
    console.error(err);
    showResult(createResultEl, 'Network error: ' + err.message, true);
  } finally {
    showLoading(submitBtn, false, originalBtnText);
  }
});

// --- View / Verify Evidence ---
const viewForm = document.getElementById('view-form');
const viewResultEl = document.getElementById('view-result');
const eventsButton = document.getElementById("events-button");
const eventsResultEl = document.getElementById("events-result");
const eventsSection = document.getElementById("events-section");
const actionForm = document.getElementById("action-form");
const fetchBtn = viewForm.querySelector('button[type="submit"]');

viewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const originalBtnText = fetchBtn.innerHTML;
  showLoading(fetchBtn, true);
  viewResultEl.classList.add('hidden');
  eventsSection.classList.add('hidden'); // Hide events when fetching new data

  const evidenceId = document.getElementById('viewEvidenceId').value.trim();
  if (!evidenceId) {
     showLoading(fetchBtn, false, originalBtnText);
     return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/evidence/${encodeURIComponent(evidenceId)}`);
    const data = await res.json();

    if (!res.ok) {
      showResult(viewResultEl, `Error: ${data.error || 'Unknown error'}\n${data.details || ''}`, true);
      return;
    }

    renderEvidenceResult(data);
  } catch (err) {
    console.error(err);
    showResult(viewResultEl, 'Network error: ' + err.message, true);
  } finally {
    showLoading(fetchBtn, false, originalBtnText);
  }
});

eventsButton.addEventListener("click", async () => {
  const evidenceId = document.getElementById("viewEvidenceId").value.trim();
  
  if (!evidenceId) {
    alert("Please enter an Evidence ID first.");
    return;
  }
  
  eventsSection.classList.remove('hidden');
  eventsResultEl.innerHTML = '<div style="padding:10px; color:#64748b"><i class="fa-solid fa-spinner fa-spin"></i> Loading blockchain events...</div>';

  try {
    const res = await fetch(
      `${API_BASE}/api/evidence/${encodeURIComponent(evidenceId)}/events`
    );
    const data = await res.json();

    if (!res.ok) {
      eventsResultEl.textContent = `Error: ${data.error || "Unknown error"}`;
      return;
    }

    renderEventsResult(data);
  } catch (err) {
    console.error(err);
    eventsResultEl.textContent = "Network error: " + err.message;
  }
});

actionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const actionBtn = actionForm.querySelector('button');
  const originalText = actionBtn.innerHTML;

  const evidenceId = document.getElementById("viewEvidenceId").value.trim();
  if (!evidenceId) {
    alert("Please fetch an evidence record first (enter Evidence ID and click Fetch).");
    return;
  }

  showLoading(actionBtn, true);

  const actionType = document.getElementById("actionType").value;
  const role = document.getElementById("actionRole").value;
  const userId = document.getElementById("actionUserId").value.trim();
  const custodian = document.getElementById("custodian").value.trim();
  const toCustodian = document.getElementById("toCustodian").value.trim();
  const notes = document.getElementById("actionNotes").value.trim();

  try {
    const res = await fetch(
      `${API_BASE}/api/evidence/${encodeURIComponent(evidenceId)}/action`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, role, userId, custodian, toCustodian, notes }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(`Error applying action: ${data.error || "Unknown error"}`);
    } else {
      alert(data.message || "Action applied.");
      // Refresh events immediately
      eventsButton.click();
      actionForm.reset();
    }
  } catch (err) {
    console.error(err);
    alert("Network error: " + err.message);
  } finally {
    showLoading(actionBtn, false, originalText);
  }
});

function renderEvidenceResult(data) {
  const { evidence, hashOnChain, hashLocal, tampered, imageUrl, imageExists } = data;
  
  let html = `<strong>Evidence Data (Blockchain):</strong>\n${JSON.stringify(evidence, null, 2)}\n\n`;
  
  html += `Hash on chain: ${hashOnChain || 'N/A'}\n`;
  html += `Hash of local image: ${hashLocal || (imageExists ? 'N/A' : 'No local image')}\n\n`;

  let statusHtml = '';
  if (tampered === true) {
    statusHtml = 'Integrity Check: <span class="status-bad"><i class="fa-solid fa-triangle-exclamation"></i> TAMPER DETECTED (Hash mismatch)</span>\n';
  } else if (tampered === false) {
    statusHtml = 'Integrity Check: <span class="status-ok"><i class="fa-solid fa-check-circle"></i> VERIFIED (Hashes match)</span>\n';
  } else if (!imageExists) {
    statusHtml = 'Integrity Check: <span class="status-bad">No local image found to verify against.</span>\n';
  } else {
    statusHtml = 'Integrity Check: Unknown.\n';
  }

  html += statusHtml;

  if (imageUrl) {
    html += '\n<div class="image-preview">';
    html += `<div><strong>Evidence Preview:</strong></div>`;
    html += `<img src="${imageUrl}" alt="Evidence image" />`;
    html += '</div>';
  }

  showResult(viewResultEl, html, tampered === true);
}

function renderEventsResult(data) {
  const { evidenceId, events } = data;

  if (!events || events.length === 0) {
    eventsResultEl.innerHTML = `<div style="padding:10px">No events found for evidence '${evidenceId}'.</div>`;
    return;
  }

  let html = '<ul class="timeline-list">';

  events.forEach((ev) => {
    const date = new Date(ev.timestamp).toLocaleString();
    html += `
      <li class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-row">
            <span class="badge">${ev.eventType}</span>
            <span class="timeline-date"><i class="fa-regular fa-calendar"></i> ${date}</span>
          </div>
          <div class="timeline-meta">
            <i class="fa-solid fa-user-shield"></i> <strong>${ev.performedBy || "unknown"}</strong>
            <span style="opacity:0.7">(${ev.role || "N/A"})</span>
          </div>
          ${
            ev.fromCustodian || ev.toCustodian
              ? `<div class="timeline-meta">
                   <i class="fa-solid fa-location-dot"></i> Custody: 
                   ${ev.fromCustodian ? `<em>${ev.fromCustodian}</em> <i class="fa-solid fa-arrow-right-long"></i> ` : ""}
                   <em>${ev.toCustodian || "N/A"}</em>
                 </div>`
              : ""
          }
          ${ev.notes ? `<div class="timeline-notes">"${ev.notes}"</div>` : ""}
          <div class="timeline-txid" title="Transaction ID">TX: ${ev.txId}</div>
        </div>
      </li>
    `;
  });

  html += "</ul>";
  eventsResultEl.innerHTML = html;
}