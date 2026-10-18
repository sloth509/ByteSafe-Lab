/* ByteSafe Lab is a deterministic teaching model. Student text is parsed as
   input data and is never evaluated or sent to a server. */
(() => {
  'use strict';

  // Mission copy and pseudocode are display/configuration data. The simulation
  // below reads only the named settings it needs; it never executes this text.
  const missions = [
    {
      id: 'stack',
      label: 'The one extra byte',
      type: 'STACK OVERFLOW',
      title: 'Smart lock access panel',
      icon: '⌑',
      level: 'STARTER',
      description: 'An 8-byte username sits next to an access flag. What happens when the input is one byte too long?',
      objective: 'Trigger the simulated overflow, then add a bounds check and prove it blocks the same input.',
      noticeTitle: 'The boundary is a rule in code.',
      notice: 'Memory is just numbered byte-sized boxes. A fixed buffer has an end; an unchecked copy can keep writing past it.',
      takeaway: 'Check the input length before copying. A single boundary check protects the neighboring value.',
      device: 'Smart lock',
      deviceDetail: 'ACCESS CONTROL: ON',
      buffer: 'username',
      capacity: 8,
      neighbor: 'is_admin',
      effect: 'The first byte past the username lands in the neighboring is_admin flag. The simulated lock grants lab access.',
      initialInput: '',
      code: 'char username[8];       // fixed-size buffer\nCHECK_LENGTH = false;    // try true to reject overlong input\ncopy_bytes(username, input);'
    },
    {
      id: 'heap',
      label: 'The heap boundary',
      type: 'HEAP OVERFLOW',
      title: 'Cooling monitor parser',
      icon: '⌁',
      level: 'FIELD CASE',
      description: 'A 6-byte packet buffer is followed by an alarm limit. A long reading can spill into that value.',
      objective: 'Send a packet past its six-byte buffer, observe the demo alarm setting change, then reject it safely.',
      noticeTitle: 'The heap has neighbors too.',
      notice: 'Heap objects are allocated dynamically. An unchecked write past one object can alter another object nearby.',
      takeaway: 'Validate packet length at the parser boundary. Sanitizers can help catch out-of-bounds writes during testing.',
      device: 'Cooling monitor',
      deviceDetail: 'ALARM LIMIT: 24 °C',
      buffer: 'packet',
      capacity: 6,
      neighbor: 'alarm_limit',
      effect: 'The first byte past packet changed the neighboring alarm_limit in this model. The demo reports a corrupted setting.',
      initialInput: '',
      code: 'char packet[6];         // heap packet buffer\nCHECK_LENGTH = false;    // try true to reject overlong input\ncopy_bytes(packet, input);'
    },
    {
      id: 'uaf',
      label: 'The stale pointer',
      type: 'USE-AFTER-FREE',
      title: 'Reused status object',
      icon: '↝',
      level: 'LIFETIME BUG',
      description: 'A status object is freed, but its old pointer is kept. Step through the timeline to see what reuses that address.',
      objective: 'Read through the stale pointer in the simulation, then clear it on release and confirm the read is blocked.',
      noticeTitle: 'A freed address can be reused.',
      notice: 'After an object is released, its old pointer is dangling. The allocator may later reuse that memory for a different object.',
      takeaway: 'Make ownership and lifetimes clear. Reset a pointer after release and prefer RAII or unique ownership in C++.',
      device: 'Status monitor',
      deviceDetail: 'STATUS OBJECT: SAFE',
      code: 'release(status);\nCLEAR_POINTER = false;  // try true after release\nread(status);            // uses the saved pointer'
    }
  ];

  const $ = (selector) => document.querySelector(selector);
  const missionList = $('#mission-list');
  const codeEditor = $('#code-editor');
  const payloadInput = $('#payload-input');
  const codeEditorUaf = $('#uaf-code-editor');
  const byteLab = $('.workbench');
  const uafLab = $('#uaf-workbench');
  const progress = Object.fromEntries(missions.map((mission) => [mission.id, { sawBug: false, testedFix: false }]));
  let activeMission = missions[0];
  let latestByteRun = null;
  let timelineStep = 0;
  let timelineMode = null;
  let timelineOutcome = null;

  function escapeText(value) {
    return String(value);
  }

  function setResult(box, kind, eyebrow, message, tag, icon) {
    box.className = `result-box result-${kind}`;
    box.querySelector('.result-eyebrow').textContent = eyebrow;
    box.querySelector('.result-copy p').textContent = message;
    box.querySelector('.result-tag').textContent = tag;
    box.querySelector('.result-icon').textContent = icon;
  }

  function activeIsUaf() {
    return activeMission.id === 'uaf';
  }

  function parseByteSettings(source, mission = activeMission) {
    // Keep the editable code pad intentionally small: recognize a buffer size
    // and a boolean check, rather than evaluating arbitrary student code.
    const bufferMatch = source.match(/\bchar\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]/i);
    const checkMatch = source.match(/\bCHECK_LENGTH\s*=\s*(true|false)\b/i);
    if (!bufferMatch || !checkMatch) {
      return { valid: false, error: 'Keep a char buffer like char name[8] and a CHECK_LENGTH = true/false line in the code pad.' };
    }
    const capacity = Number(bufferMatch[2]);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 16) {
      return { valid: false, error: 'For this visual model, set the buffer size to a whole number from 1 to 16.' };
    }
    return { valid: true, buffer: bufferMatch[1], capacity, checked: checkMatch[1].toLowerCase() === 'true', neighbor: mission.neighbor };
  }

  function parseUafSettings() {
    // The lifetime lab has one supported switch, parsed as data just like the
    // byte labs' bounds-check setting.
    const source = codeEditorUaf.value;
    const clearMatch = source.match(/\bCLEAR_POINTER\s*=\s*(true|false)\b/i);
    if (!clearMatch) return { valid: false, error: 'Keep a CLEAR_POINTER = true/false line in the code pad.' };
    return { valid: true, clearsPointer: clearMatch[1].toLowerCase() === 'true' };
  }

  function setByteModeIndicator(checked, invalid = false) {
    const indicator = $('#mode-indicator');
    indicator.classList.toggle('mode-patched', checked && !invalid);
    indicator.classList.toggle('mode-vulnerable', !checked && !invalid);
    const label = invalid ? 'Check code settings' : checked ? 'Patched version' : 'Vulnerable version';
    $('#mode-label').textContent = label.toUpperCase();
    $('#code-summary-status').textContent = label;
    $('#code-summary-status').classList.toggle('is-patched', checked && !invalid);
    $('#code-summary-status').classList.toggle('is-invalid', invalid);
  }

  function setUafModeIndicator(checked, invalid = false) {
    const indicator = $('#uaf-mode-indicator');
    indicator.classList.toggle('mode-patched', checked && !invalid);
    indicator.classList.toggle('mode-vulnerable', !checked && !invalid);
    const label = invalid ? 'Check code settings' : checked ? 'Patched version' : 'Vulnerable version';
    $('#uaf-mode-label').textContent = label.toUpperCase();
    $('#uaf-code-summary-status').textContent = label;
    $('#uaf-code-summary-status').classList.toggle('is-patched', checked && !invalid);
    $('#uaf-code-summary-status').classList.toggle('is-invalid', invalid);
  }

  function updateModePreview() {
    if (activeIsUaf()) {
      const parsed = parseUafSettings();
      setUafModeIndicator(parsed.clearsPointer, !parsed.valid);
    } else {
      const parsed = parseByteSettings(codeEditor.value);
      setByteModeIndicator(parsed.checked, !parsed.valid);
      if (parsed.valid) {
        payloadInput.placeholder = `Try ${parsed.capacity + 1} A's…`;
        const byteCount = new TextEncoder().encode(payloadInput.value).length;
        $('#byte-count').textContent = `${byteCount} ${byteCount === 1 ? 'BYTE' : 'BYTES'}`;
      }
    }
  }

  function renderMissionList() {
    missionList.replaceChildren();
    missions.forEach((mission, index) => {
      const complete = progress[mission.id].sawBug && progress[mission.id].testedFix;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mission-button${complete ? ' is-complete' : ''}`;
      button.dataset.mission = mission.id;
      button.setAttribute('aria-current', mission.id === activeMission.id ? 'step' : 'false');
      button.setAttribute('aria-label', `Mission ${index + 1}: ${mission.label}${complete ? ', patched' : ''}`);
      const number = document.createElement('span');
      number.className = 'mission-number';
      number.textContent = `0${index + 1}`;
      const content = document.createElement('span');
      content.className = 'mission-name';
      const name = document.createElement('span');
      name.textContent = mission.label;
      const type = document.createElement('small');
      type.className = 'mission-type';
      type.textContent = mission.type;
      content.append(name, type);
      const check = document.createElement('span');
      check.className = 'mission-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = complete ? '✓' : '';
      button.append(number, content, check);
      missionList.append(button);
    });
    updateProgress();
  }

  function updateProgress() {
    const done = missions.filter((mission) => progress[mission.id].sawBug && progress[mission.id].testedFix).length;
    $('#progress-label').textContent = `${done} / ${missions.length}`;
    $('#progress-fill').style.width = `${(done / missions.length) * 100}%`;
  }

  function updateCompletion() {
    const complete = progress[activeMission.id].sawBug && progress[activeMission.id].testedFix;
    $('#mission-complete-banner').hidden = !complete;
    renderMissionList();
    if (missions.every((mission) => progress[mission.id].sawBug && progress[mission.id].testedFix)) {
      $('#mission-complete-banner').querySelector('small').textContent = 'All three labs complete. Nice work protecting memory boundaries and lifetimes.';
    } else {
      $('#mission-complete-banner').querySelector('small').textContent = 'You showed the bug and verified the fix.';
    }
  }

  function setDeviceState(alert, detail) {
    const card = $('.device-card');
    card.classList.toggle('is-compromised', Boolean(alert));
    const status = $('#device-status');
    status.classList.toggle('status-alert', Boolean(alert));
    status.querySelector('span').textContent = alert ? 'CHANGED' : 'SECURE';
    $('#device-detail').textContent = detail || activeMission.deviceDetail;
  }

  function updateMissionCopy() {
    const index = missions.findIndex((mission) => mission.id === activeMission.id) + 1;
    $('#mission-count').textContent = `0${index} / 0${missions.length}`;
    $('#mission-kicker').innerHTML = `LAB 0${index} <span class="meta-slash">/</span> ${activeMission.type}`;
    $('#mission-title').textContent = activeMission.title;
    $('#mission-description').textContent = activeMission.description;
    $('#mission-objective').textContent = activeMission.objective;
    $('#mission-icon').textContent = activeMission.icon;
    $('#level-pill').textContent = activeMission.level;
    $('#notice-title').textContent = activeMission.noticeTitle;
    $('#notice-copy').textContent = activeMission.notice;
    $('#takeaway-copy').textContent = activeMission.takeaway;
    $('#device-name').textContent = activeMission.device;
    $('#device-detail').textContent = activeMission.deviceDetail;
  }

  function resetByteLab() {
    latestByteRun = null;
    payloadInput.value = '';
    $('#byte-count').textContent = '0 BYTES';
    const config = parseByteSettings(codeEditor.value);
    renderMemory(config.valid ? config : { buffer: activeMission.buffer, capacity: activeMission.capacity, neighbor: activeMission.neighbor });
    setResult($('#result-box'), 'idle', 'READY WHEN YOU ARE', 'Run an input to see how this version of the code behaves.', 'AWAITING INPUT', '⌁');
    setDeviceState(false, activeMission.deviceDetail);
  }

  function setMission(id) {
    const found = missions.find((mission) => mission.id === id);
    if (!found) return;
    activeMission = found;
    $('#code-details').open = false;
    $('#uaf-code-details').open = false;
    updateMissionCopy();
    renderMissionList();
    const isUaf = activeIsUaf();
    byteLab.hidden = isUaf;
    uafLab.hidden = !isUaf;
    $('#mission-complete-banner').hidden = !(progress[id].sawBug && progress[id].testedFix);
    if (isUaf) {
      codeEditorUaf.value = activeMission.code;
      resetUafTimeline();
      updateModePreview();
      setDeviceState(false, activeMission.deviceDetail);
    } else {
      codeEditor.value = activeMission.code;
      resetByteLab();
      updateModePreview();
    }
  }

  function createCell(label, index, value, neighbor, overflow) {
    const cell = document.createElement('div');
    cell.className = `memory-cell${neighbor ? ' neighbor' : ''}${value !== 0 ? ` written${overflow ? ' overflow-write' : ''}` : ''}`;
    cell.style.setProperty('--stagger', `${Math.min(index, 19) * 30}ms`);
    cell.setAttribute('aria-label', `${label}, byte ${index}, value ${value.toString(16).padStart(2, '0')}`);
    const top = document.createElement('span');
    top.className = 'memory-cell-label';
    top.textContent = `+${index.toString(16).toUpperCase().padStart(2, '0')}`;
    const byte = document.createElement('span');
    byte.className = 'memory-cell-byte';
    byte.textContent = value.toString(16).toUpperCase().padStart(2, '0');
    const character = document.createElement('span');
    character.className = 'memory-cell-char';
    character.textContent = value >= 32 && value <= 126 ? String.fromCharCode(value) : '·';
    cell.append(top, byte, character);
    return cell;
  }

  function renderMemory(config, byteRun = latestByteRun) {
    // Rebuild a bounded visual snapshot: the chosen buffer plus four nearby
    // cells. These DOM cells represent model values, never process memory.
    const host = $('#memory-map');
    host.replaceChildren();
    const capacity = Math.max(1, Math.min(16, config.capacity || activeMission.capacity));
    const buffer = config.buffer || activeMission.buffer;
    const neighbor = config.neighbor || activeMission.neighbor;
    const bufferValues = Array(capacity).fill(0);
    const neighborValues = Array(4).fill(0);
    const bufferOverflow = Array(capacity).fill(false);
    const neighborOverflow = Array(4).fill(false);
    if (byteRun && byteRun.snapshotCapacity === capacity && byteRun.buffer === buffer) {
      byteRun.visibleBytes.forEach(({ position, value }) => {
        if (position < capacity) { bufferValues[position] = value; bufferOverflow[position] = position >= byteRun.capacity; }
        else if (position < capacity + 4) { neighborValues[position - capacity] = value; neighborOverflow[position - capacity] = true; }
      });
    }
    const addGroup = (groupName, values, isNeighbor, overflowFlags) => {
      const group = document.createElement('div');
      group.className = 'memory-group';
      const heading = document.createElement('div');
      heading.className = 'memory-group-label';
      const title = document.createElement('span');
      title.className = 'group-name';
      title.textContent = groupName;
      const range = document.createElement('span');
      range.textContent = `${isNeighbor ? `+${capacity}` : '+00'} — +${(isNeighbor ? capacity + values.length - 1 : capacity - 1).toString(16).toUpperCase().padStart(2, '0')}`;
      heading.append(title, range);
      const row = document.createElement('div');
      row.className = 'memory-cells';
      values.forEach((value, index) => row.append(createCell(groupName, isNeighbor ? capacity + index : index, value, isNeighbor, overflowFlags[index])));
      group.append(heading, row);
      host.append(group);
    };
    addGroup(buffer, bufferValues, false, bufferOverflow);
    const divider = document.createElement('div');
    divider.className = 'overflow-divider';
    divider.textContent = 'BUFFER EDGE';
    host.append(divider);
    addGroup(neighbor, neighborValues, true, neighborOverflow);
    $('#memory-caption-text').textContent = byteRun && byteRun.beyondVisible > 0
      ? `${byteRun.beyondVisible} additional byte${byteRun.beyondVisible === 1 ? '' : 's'} spilled beyond the visible neighbor cells.`
      : 'Adjacent values are modeled for teaching; real layouts vary by compiler and system.';
  }

  function runByteSimulation() {
    const config = parseByteSettings(codeEditor.value);
    setByteModeIndicator(config.checked, !config.valid);
    if (!config.valid) {
      $('#code-details').open = true;
      latestByteRun = null;
      renderMemory({ buffer: activeMission.buffer, capacity: activeMission.capacity, neighbor: activeMission.neighbor });
      setResult($('#result-box'), 'danger', 'CODE SETTINGS NOT RECOGNIZED', config.error, 'NO MEMORY CHANGED', '⌕');
      return;
    }
    // UTF-8 byte count makes the boundary meaningful for non-ASCII input too.
    // A checked copy rejects the whole input; an unchecked copy only updates
    // this capped teaching snapshot and cannot write outside the page model.
    const bytes = Array.from(new TextEncoder().encode(payloadInput.value));
    const overflowCount = Math.max(0, bytes.length - config.capacity);
    const blocked = config.checked && overflowCount > 0;
    const visibleBytes = [];
    if (!blocked) bytes.slice(0, config.capacity + 4).forEach((value, index) => visibleBytes.push({ position: index, value }));
    latestByteRun = {
      buffer: config.buffer,
      capacity: config.capacity,
      snapshotCapacity: config.capacity,
      visibleBytes,
      overflowCount,
      beyondVisible: Math.max(0, bytes.length - (config.capacity + 4)),
      blocked,
      checked: config.checked,
      effect: !blocked && overflowCount > 0 && bytes[config.capacity] !== 0,
      payloadBytes: bytes.length
    };
    renderMemory(config, latestByteRun);

    if (overflowCount > 0 && config.checked) {
      progress[activeMission.id].testedFix = true;
      setDeviceState(false, activeMission.deviceDetail);
      setResult($('#result-box'), 'success', 'BOUNDS CHECK BLOCKED INPUT', `The code rejected ${bytes.length} bytes before copying. ${config.neighbor} stayed unchanged; the simulated device is secure.`, 'PATCH VERIFIED', '✓');
    } else if (overflowCount > 0) {
      progress[activeMission.id].sawBug = true;
      const effect = latestByteRun.effect;
      setDeviceState(effect, effect ? `${config.neighbor.toUpperCase()}: CHANGED` : activeMission.deviceDetail);
      setResult($('#result-box'), 'danger', 'OUT-OF-BOUNDS WRITE', `${bytes.length} bytes entered a ${config.capacity}-byte buffer. ${activeMission.effect}`, effect ? 'SIMULATED STATE CHANGED' : 'BOUNDARY CROSSED', '⚠');
    } else if (bytes.length === 0) {
      setDeviceState(false, activeMission.deviceDetail);
      setResult($('#result-box'), 'idle', 'NO INPUT TO COPY', 'Enter a few characters, then run again to watch their bytes land in the buffer.', 'AWAITING INPUT', '⌁');
    } else {
      setDeviceState(false, activeMission.deviceDetail);
      setResult($('#result-box'), 'success', 'INPUT STAYED IN BOUNDS', `${bytes.length} bytes fit in the ${config.capacity}-byte buffer. The neighboring ${config.neighbor} was left alone.`, 'NO OVERFLOW', '✓');
    }
    updateCompletion();
  }

  function codeWithSetting(source, setting, value) {
    const matcher = new RegExp(`(^\\s*${setting}\\s*=\\s*)(true|false)(\\b.*$)`, 'im');
    if (matcher.test(source)) return source.replace(matcher, `$1${value}$3`);
    return `${source.trimEnd()}\n${setting} = ${value};`;
  }

  function loadByteDemo(checkLength) {
    // Facilitator presets change the same editable setting and use the normal
    // student-facing simulation path, so the demonstration stays comparable.
    const expected = activeMission;
    codeEditor.value = expected.code;
    codeEditor.value = codeWithSetting(codeEditor.value, 'CHECK_LENGTH', checkLength);
    const config = parseByteSettings(codeEditor.value);
    payloadInput.value = expected.id === 'heap' ? 'TEMP=OK' : 'A'.repeat(config.valid ? config.capacity + 1 : expected.capacity + 1);
    updateModePreview();
    runByteSimulation();
  }

  function loadUafDemo(clearPointer) {
    // Run the four fixed timeline steps through the ordinary transition logic
    // so facilitator presets produce the same outcome as manual stepping.
    codeEditorUaf.value = activeMission.code;
    codeEditorUaf.value = codeWithSetting(codeEditorUaf.value, 'CLEAR_POINTER', clearPointer);
    timelineStep = 0;
    timelineMode = null;
    timelineOutcome = null;
    updateModePreview();
    while (timelineStep < 4) advanceUafTimeline();
  }

  function setTextResultForInvalidUaf(message) {
    setResult($('#uaf-result'), 'danger', 'CODE SETTINGS NOT RECOGNIZED', message, 'NO POINTER READ', '⌕');
  }

  function resetUafTimeline() {
    timelineStep = 0;
    timelineMode = null;
    timelineOutcome = null;
    renderUafTimeline();
    setResult($('#uaf-result'), 'idle', 'READY WHEN YOU ARE', 'The object and pointer are waiting in the simulated heap.', 'AWAITING INPUT', '⌁');
    $('#uaf-next').disabled = false;
    $('#uaf-next').querySelector('span').textContent = 'Next step';
    $('#uaf-instruction').textContent = 'Step through each event to see what the saved pointer refers to.';
    setDeviceState(false, activeMission.deviceDetail);
  }

  function renderUafTimeline() {
    // This is a fixed teaching story with a fictional address and objects;
    // rendering it never allocates, frees, or dereferences real memory.
    const timeline = $('#uaf-timeline');
    timeline.replaceChildren();
    const labels = [
      ['01', 'Allocate', 'Create status = SAFE'],
      ['02', 'Release', 'Object lifetime ends'],
      ['03', 'Reuse slot', 'A new object takes that address'],
      ['04', 'Read pointer', 'Follow the old address']
    ];
    labels.forEach((step, index) => {
      const card = document.createElement('div');
      const isCurrent = timelineStep === index + 1;
      const isFutureBug = timelineStep >= 2 && index === 1 && timelineMode === false;
      const isFutureFix = timelineStep >= 2 && index === 1 && timelineMode === true;
      card.className = `timeline-step${isCurrent ? ' is-active' : ''}${isFutureBug ? ' is-bug' : ''}${isFutureFix ? ' is-fixed' : ''}`;
      const number = document.createElement('span');
      number.className = 'timeline-number';
      number.textContent = step[0];
      const title = document.createElement('b');
      title.textContent = step[1];
      const detail = document.createElement('small');
      detail.textContent = step[2];
      card.append(number, title, detail);
      timeline.append(card);
    });

    const settings = parseUafSettings();
    const fixed = settings.valid && settings.clearsPointer;
    const objectActive = timelineStep === 1;
    const objectReused = timelineStep >= 3;
    const pointerCleared = fixed && timelineStep >= 2;
    const pointerStale = !fixed && timelineStep >= 2;
    const visual = $('#pointer-visual');
    visual.replaceChildren();
    const object = document.createElement('div');
    object.className = `pointer-card${objectReused ? ' stale' : ''}`;
    const objectLabel = document.createElement('span');
    objectLabel.className = 'pointer-card-label';
    objectLabel.textContent = objectActive ? 'ALLOCATED OBJECT' : objectReused ? 'NEW OBJECT AT OLD ADDRESS' : timelineStep >= 2 ? 'OLD OBJECT RELEASED' : 'HEAP SLOT';
    const objectValue = document.createElement('span');
    objectValue.className = 'pointer-card-value';
    objectValue.textContent = objectActive ? 'STATUS = SAFE' : objectReused ? 'LOCK_STATE = OPEN' : timelineStep >= 2 ? 'MEMORY AVAILABLE' : '—';
    const objectAddress = document.createElement('span');
    objectAddress.className = 'pointer-address';
    objectAddress.textContent = timelineStep >= 1 ? 'address 0x1A20' : 'address not allocated';
    object.append(objectLabel, objectValue, objectAddress);
    const arrow = document.createElement('div');
    arrow.className = `pointer-arrow${pointerStale ? ' is-stale' : ''}`;
    arrow.textContent = pointerCleared ? '×' : timelineStep === 0 ? '·' : '←';
    arrow.setAttribute('aria-label', pointerCleared ? 'pointer cleared' : pointerStale ? 'stale pointer still points to reused address' : 'pointer address');
    const pointer = document.createElement('div');
    pointer.className = `pointer-card${pointerStale ? ' stale' : ''}`;
    const pointerLabel = document.createElement('span');
    pointerLabel.className = 'pointer-card-label';
    pointerLabel.textContent = 'SAVED POINTER';
    const pointerValue = document.createElement('span');
    pointerValue.className = 'pointer-card-value';
    pointerValue.textContent = pointerCleared ? 'NULL' : timelineStep >= 1 ? 'status → 0x1A20' : 'status → —';
    const pointerAddress = document.createElement('span');
    pointerAddress.className = 'pointer-address';
    pointerAddress.textContent = pointerStale ? 'dangling reference' : pointerCleared ? 'cleared on release' : 'owner: demo service';
    pointer.append(pointerLabel, pointerValue, pointerAddress);
    visual.append(object, arrow, pointer);
  }

  function advanceUafTimeline() {
    const settings = parseUafSettings();
    setUafModeIndicator(settings.clearsPointer, !settings.valid);
    if (!settings.valid) {
      $('#uaf-code-details').open = true;
      setTextResultForInvalidUaf(settings.error);
      return;
    }
    if (timelineMode !== null && timelineMode !== settings.clearsPointer) {
      timelineStep = 0;
      timelineOutcome = null;
    }
    timelineMode = settings.clearsPointer;
    if (timelineStep >= 4) {
      $('#uaf-instruction').textContent = 'Timeline complete. Change CLEAR_POINTER and reset or step again to compare the other version.';
      return;
    }
    timelineStep += 1;
    renderUafTimeline();
    if (timelineStep === 1) {
      $('#uaf-instruction').textContent = 'The demo service allocated a status object at address 0x1A20.';
      setResult($('#uaf-result'), 'idle', 'OBJECT ALLOCATED', 'The pointer refers to a live object that reports SAFE.', 'STEP 1 OF 4', '↗');
    } else if (timelineStep === 2) {
      $('#uaf-instruction').textContent = settings.clearsPointer ? 'The object was released and CLEAR_POINTER set the saved pointer to NULL.' : 'The object was released, but the saved pointer still holds its old address.';
      setResult($('#uaf-result'), settings.clearsPointer ? 'success' : 'danger', settings.clearsPointer ? 'POINTER CLEARED' : 'DANGLING POINTER', settings.clearsPointer ? 'The code no longer keeps a reference to the released object.' : 'The pointer still says 0x1A20, even though the object lifetime has ended.', 'STEP 2 OF 4', settings.clearsPointer ? '✓' : '⚠');
    } else if (timelineStep === 3) {
      $('#uaf-instruction').textContent = 'The simulated allocator reused address 0x1A20 for a different demo value.';
      setResult($('#uaf-result'), settings.clearsPointer ? 'success' : 'danger', settings.clearsPointer ? 'ADDRESS REUSED SAFELY' : 'SAME ADDRESS, NEW OBJECT', settings.clearsPointer ? 'The old pointer was cleared, so the service has no stale route to the new object.' : 'The saved address now contains a different object: LOCK_STATE = OPEN.', 'STEP 3 OF 4', settings.clearsPointer ? '✓' : '⚠');
    } else {
      timelineOutcome = settings.clearsPointer ? 'blocked' : 'stale-read';
      if (settings.clearsPointer) {
        progress[activeMission.id].testedFix = true;
        $('#uaf-instruction').textContent = 'The read was blocked because the pointer is NULL. The old object cannot be accessed.';
        setResult($('#uaf-result'), 'success', 'STALE READ BLOCKED', 'The simulator refused the read after release. The stale pointer path is closed.', 'PATCH VERIFIED', '✓');
        setDeviceState(false, 'SAFE: STALE READ BLOCKED');
      } else {
        progress[activeMission.id].sawBug = true;
        $('#uaf-instruction').textContent = 'The old pointer read the new object at that reused address. This is a simulated use-after-free.';
        setResult($('#uaf-result'), 'danger', 'USE-AFTER-FREE SIMULATED', 'The stale pointer read LOCK_STATE = OPEN from the reused slot. No real object or device was touched.', 'SIMULATED STATE CHANGED', '⚠');
        setDeviceState(true, 'LOCK STATE: OPEN');
      }
    }
    $('#uaf-next').querySelector('span').textContent = timelineStep === 4 ? 'Timeline complete' : 'Next step';
    $('#uaf-next').disabled = timelineStep === 4;
    if (timelineStep === 4) updateCompletion();
  }

  missionList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mission]');
    if (button) setMission(button.dataset.mission);
  });
  codeEditor.addEventListener('input', updateModePreview);
  codeEditorUaf.addEventListener('input', updateModePreview);
  payloadInput.addEventListener('input', () => {
    const count = new TextEncoder().encode(payloadInput.value).length;
    $('#byte-count').textContent = `${count} ${count === 1 ? 'BYTE' : 'BYTES'}`;
  });
  $('#run-button').addEventListener('click', runByteSimulation);
  payloadInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') runByteSimulation(); });
  $('#clear-button').addEventListener('click', resetByteLab);
  $('#fill-edge').addEventListener('click', () => fillPayloadToLimit(false));
  $('#fill-overflow').addEventListener('click', () => fillPayloadToLimit(true));
  $('#uaf-next').addEventListener('click', advanceUafTimeline);
  $('#uaf-reset').addEventListener('click', resetUafTimeline);
  $('#facilitator-toggle').addEventListener('click', (event) => {
    const button = event.currentTarget;
    const panel = $('#facilitator-panel');
    const willOpen = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(willOpen));
    panel.hidden = !willOpen;
  });
  $('#host-show-bug').addEventListener('click', () => activeIsUaf() ? loadUafDemo(false) : loadByteDemo(false));
  $('#host-show-fix').addEventListener('click', () => activeIsUaf() ? loadUafDemo(true) : loadByteDemo(true));
  $('#host-next').addEventListener('click', () => {
    const index = missions.findIndex((mission) => mission.id === activeMission.id);
    setMission(missions[(index + 1) % missions.length].id);
  });
  $('#host-reset').addEventListener('click', () => {
    if (activeIsUaf()) {
      codeEditorUaf.value = activeMission.code;
      resetUafTimeline();
      updateModePreview();
    } else {
      codeEditor.value = activeMission.code;
      resetByteLab();
      updateModePreview();
    }
  });
  $('#next-lab-button').addEventListener('click', () => {
    const index = missions.findIndex((mission) => mission.id === activeMission.id);
    setMission(missions[(index + 1) % missions.length].id);
  });

  function fillPayloadToLimit(addExtraByte) {
    const settings = parseByteSettings(codeEditor.value);
    if (!settings.valid) {
      $('#code-details').open = true;
      setResult($('#result-box'), 'danger', 'CHECK THE CODE SETTINGS', settings.error, 'NO MEMORY CHANGED', '⌕');
      codeEditor.focus();
      return;
    }
    payloadInput.value = 'A'.repeat(settings.capacity + (addExtraByte ? 1 : 0));
    payloadInput.dispatchEvent(new Event('input', { bubbles: true }));
    payloadInput.focus();
  }

  const motionToggle = $('#motion-toggle');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Remember only the motion preference in this browser. Lab progress and
  // workshop inputs remain in memory for the current page session.
  function savedMotionPreference() {
    try { return window.localStorage.getItem('bytesafe-motion'); }
    catch { return null; }
  }
  let motionEnabled = savedMotionPreference() === 'on' ? true : savedMotionPreference() === 'off' ? false : !reducedMotionQuery.matches;
  function applyMotionPreference() {
    document.body.classList.toggle('motion-off', !motionEnabled);
    document.body.classList.toggle('motion-on', motionEnabled);
    motionToggle.setAttribute('aria-pressed', String(motionEnabled));
    $('#motion-label').textContent = motionEnabled ? 'Motion on' : 'Motion off';
    motionToggle.title = motionEnabled ? 'Turn interface animations off' : 'Turn interface animations on';
  }
  motionToggle.addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    try { window.localStorage.setItem('bytesafe-motion', motionEnabled ? 'on' : 'off'); } catch { /* Preference stays in memory if storage is unavailable. */ }
    applyMotionPreference();
  });
  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', (event) => {
      if (savedMotionPreference() === null) {
        motionEnabled = !event.matches;
        applyMotionPreference();
      }
    });
  }
  applyMotionPreference();

  renderMissionList();
  updateMissionCopy();
  codeEditor.value = activeMission.code;
  resetByteLab();
  updateModePreview();
})();
