/* ByteSafe Lab is a local teaching simulation. Editable pseudocode is parsed
   for a few named settings; student text is never compiled or evaluated. */
(() => {
  'use strict';

  // Quest copy, questions, and pseudocode are configuration data for the UI.
  // Each mission kind selects a bounded local mechanic below.
  const missions = [
    {
      id: 'map', label: 'Map the Memory', type: 'MEMORY BASICS', kind: 'quiz', rank: 'QUEST 1',
      title: 'Map the Memory', device: 'Archive map', deviceDetail: 'ONE CHAR: ONE BYTE',
      description: 'Before you protect the archive, learn how its byte-sized rooms are numbered.',
      objective: 'Learn how many byte boxes a character uses and how addresses move.',
      noticeTitle: 'Memory is arranged in byte-sized boxes.',
      notice: 'Each byte has an address. A char uses one byte; an int usually uses four. Values can sit next to one another.',
      takeaway: 'Keep track of the size and address range each value uses.',
      questions: [{
        prompt: 'How many byte boxes does one char use?',
        choices: [
          { text: '1 byte', correct: true, reply: 'Correct. A char uses one byte. An int usually uses four, so its value spans several boxes.' },
          { text: '4 bytes', reply: 'An int usually uses four bytes. A char uses one.' },
          { text: '8 bytes', reply: 'That is larger than one char. In this model a char is one byte.' }
        ]
      }, {
        prompt: 'A one-byte char starts at address 0x1000. What address comes next?',
        choices: [
          { text: '0x1001', correct: true, reply: 'Exactly. Each byte has the next address, so neighboring values can occupy the boxes right after a buffer.' },
          { text: '0x1004', reply: 'That would skip four byte addresses. The next byte after 0x1000 is 0x1001.' },
          { text: '0x1008', reply: 'That would skip eight byte addresses. The next byte after 0x1000 is 0x1001.' }
        ]
      }]
    },
    {
      id: 'stack', label: 'The Ninth Byte', type: 'STACK OVERFLOW', kind: 'stack', rank: 'QUEST 2',
      title: 'The Ninth Byte', device: 'Smart lock access', deviceDetail: 'ACCESS FLAG: LOCKED',
      description: 'A username buffer has room for eight bytes. The archive received nine.',
      objective: 'Watch the extra byte reach a neighboring flag, then reject it with a length check.',
      noticeTitle: 'A buffer has a boundary; an unchecked copy may not.',
      notice: 'Stack variables can sit beside one another. A write past a local buffer may alter a neighboring value, crash a program, leak data, or affect control flow.',
      takeaway: 'Check a length before copying. Do not assume the input fits.',
      buffer: 'username', capacity: 8, neighbor: 'is_admin',
      effect: 'The ninth byte reached the neighboring access flag in this teaching model.',
      initialInput: 'AAAAAAAAA',
      code: 'char username[8];\nCHECK_LENGTH = false;\ncopy_bytes(username, input);'
    },
    {
      id: 'heap', label: 'Heap Courier', type: 'HEAP OVERFLOW', kind: 'heap', rank: 'QUEST 3',
      title: 'Heap Courier', device: 'Cooling monitor', deviceDetail: 'ALARM LIMIT: 24 °C',
      description: 'A packet parser has a six-byte slot. Deliver a packet that is too long.',
      objective: 'Find the packet that crosses the heap buffer, then validate its length before copying.',
      noticeTitle: 'Heap objects can have neighbors too.',
      notice: 'An unchecked write past a dynamically allocated object can affect another nearby value. Allocator layout varies.',
      takeaway: 'Validate packet size and format at the parser boundary.',
      buffer: 'packet', capacity: 6, neighbor: 'alarm_limit',
      effect: 'The overlong packet changed the neighboring alarm setting in this model.',
      initialInput: 'TEMP=OK',
      code: 'char packet[6];\nCHECK_LENGTH = false;\ncopy_bytes(packet, input);'
    },
    {
      id: 'pointer', label: 'Address Compass', type: 'POINTERS', kind: 'quiz', rank: 'QUEST 4',
      title: 'Address Compass', device: 'Address compass', deviceDetail: 'POINTER: ADDRESS',
      description: 'The archive map points to locations. Follow the address, not the value.',
      objective: 'Identify what a pointer stores and how pointer steps move through memory.',
      noticeTitle: 'A pointer holds an address.',
      notice: 'Dereferencing follows that address to read or write. Pointer arithmetic moves by the size of the pointed-to type.',
      takeaway: 'A wrong or stale address can reach data the code does not own.',
      questions: [
        {
          prompt: 'What does a pointer store?',
          choices: [
            { text: 'The address of a value', correct: true, reply: 'Correct. A pointer stores a location. Dereferencing follows it to the value.' },
            { text: 'The value itself, copied into the pointer', reply: 'A pointer stores an address. The value is at that location.' },
            { text: 'The number of bytes in a variable', reply: 'That is a size. A pointer stores an address.' }
          ]
        },
        {
          prompt: 'When a typed pointer moves by one, what determines the byte distance?',
          choices: [
            { text: 'The size of the pointed-to type', correct: true, reply: 'Right. Pointer arithmetic is scaled by the pointed-to type, so a step may move several bytes.' },
            { text: 'It always moves exactly one byte', reply: 'Not for every type. A typed pointer step uses the size of its pointed-to type.' },
            { text: 'The length of the variable name', reply: 'Names do not affect addresses. The pointed-to type determines the step.' }
          ]
        }
      ]
    },
    {
      id: 'uaf', label: 'The Reused Slot', type: 'USE-AFTER-FREE', kind: 'uaf', rank: 'QUEST 5',
      title: 'The Reused Slot', device: 'Status monitor', deviceDetail: 'STATUS OBJECT: SAFE',
      description: 'A released object leaves its address behind. Follow what happens when that slot is reused.',
      objective: 'Trace the dangling pointer, then clear it and replay the timeline.',
      noticeTitle: 'A freed address can change meaning.',
      notice: 'A pointer may still hold an address after an object is released. An allocator can reuse that slot for another object.',
      takeaway: 'Make ownership clear. Reset pointers after release and prefer unique ownership such as unique_ptr.',
      code: 'release(status);\nCLEAR_POINTER = false;\nread(status);'
    },
    {
      id: 'fuzz', label: 'Fuzzing Trail', type: 'PARSER + FUZZER', kind: 'fuzzer', rank: 'QUEST 6',
      title: 'Fuzzing Trail', device: 'Packet parser', deviceDetail: 'PARSER: READY',
      description: 'The parser sees more than normal inputs. Let a small fuzzer probe its boundary.',
      objective: 'Find the smallest failing input, patch the parser, and rerun the same boundary set.',
      noticeTitle: 'Fuzzers try many unusual inputs.',
      notice: 'This miniature fuzzer checks increasing input lengths and exposes the shortest failure. Real fuzzers mutate many input formats and minimize cases that fail.',
      takeaway: 'Keep the smallest failing case as a regression test after fixing the parser.',
      buffer: 'packet', capacity: 8, neighbor: 'record_size',
      effect: 'The smallest failing input crossed the parser buffer boundary in this model.',
      initialInput: '',
      code: 'char packet[8];\nCHECK_LENGTH = false;\nparse_bytes(packet, input);'
    },
    {
      id: 'sanitizer', label: 'Sanitizer Scan', type: 'ASAN + UBSAN', kind: 'sanitizer', rank: 'QUEST 7',
      title: 'Sanitizer Scan', device: 'Cooling monitor', deviceDetail: 'PARSER: CHECKED',
      description: 'The test case is known. Ask a sanitizer to point out the first unsafe access.',
      objective: 'Read the simulated diagnostic, add a bounds check, and scan the same case again.',
      noticeTitle: 'Sanitizers catch unsafe behavior during testing.',
      notice: 'AddressSanitizer can report out-of-bounds access and use-after-free. UBSan reports several kinds of undefined behavior.',
      takeaway: 'Fix the first clear report, then rerun tests with sanitizers enabled.',
      buffer: 'packet', capacity: 6, neighbor: 'alarm_limit',
      effect: 'The diagnostic found a write beyond the packet buffer.',
      initialInput: 'TEMP=OK',
      code: 'char packet[6];\nCHECK_LENGTH = false;\ncopy_bytes(packet, input);'
    },
    {
      id: 'review', label: 'Patchwright Review', type: 'SAFER C++ + AI', kind: 'quiz', rank: 'QUEST 8',
      title: 'Patchwright Review', device: 'Archive review desk', deviceDetail: 'PATCH: HUMAN VERIFIED',
      description: 'The archive proposes a patch. Choose safer tools, then verify the suggestion yourself.',
      objective: 'Choose safer C++ patterns and decide how to check an AI-assisted fix.',
      noticeTitle: 'Safer APIs reduce common memory mistakes.',
      notice: 'Prefer std::string, bounds-checked access such as .at(), span views, and clear ownership such as unique_ptr.',
      takeaway: 'AI can suggest a patch, but tests, fuzzing, sanitizers, and human review must verify it.',
      questions: [
        {
          prompt: 'Replace a fixed char buffer and unchecked string copy. Which choice is safer?',
          choices: [
            { text: 'Use std::string for the username', correct: true, reply: 'Good choice. std::string manages its own size and avoids a fixed char buffer for this input.' },
            { text: 'Keep the buffer and call strcpy again', reply: 'That keeps the unchecked copy. Prefer a size-aware string or a checked operation.' }
          ]
        },
        {
          prompt: 'Which access checks whether an index is in range?',
          choices: [
            { text: 'Use container.at(index)', correct: true, reply: 'Correct. at() checks bounds. A span can also make the available range explicit in an API.' },
            { text: 'Use container[index] without checking', reply: 'Unchecked indexing can still go out of range. Use at() or validate the index first.' }
          ]
        },
        {
          prompt: 'Which tool expresses one clear owner of a heap object?',
          choices: [
            { text: 'std::unique_ptr', correct: true, reply: 'Right. unique_ptr ties the object lifetime to its owner and avoids manual delete in the usual path.' },
            { text: 'A raw owning pointer copied to several places', reply: 'Several raw owners make lifetime bugs easier. Prefer a clear owner such as unique_ptr.' }
          ]
        },
        {
          prompt: 'An AI suggests a fix. What should the Memory Keeper do next?',
          choices: [
            { text: 'Review it, then verify with tests, fuzzing, and sanitizers', correct: true, reply: 'Quest complete. AI can help find and rewrite risky code, but people still verify the patch.' },
            { text: 'Accept it because the explanation sounds confident', reply: 'AI can be confidently wrong. Review the change and verify it with tests and tools.' }
          ]
        }
      ]
    }
  ];

  const $ = (selector) => document.querySelector(selector);
  const missionList = $('#mission-list');
  const codeEditor = $('#code-editor');
  const payloadInput = $('#payload-input');
  const codeEditorUaf = $('#uaf-code-editor');
  const byteLab = $('#byte-workbench');
  const uafLab = $('#uaf-workbench');
  const quizLab = $('#quiz-workbench');
  const savedCompleted = readCompletedMissions();
  const progress = Object.fromEntries(missions.map((mission) => [mission.id, {
    sawBug: false,
    testedFix: false,
    completed: savedCompleted.has(mission.id)
  }]));
  let activeMission = missions[0];
  let latestByteRun = null;
  let timelineStep = 0;
  let timelineMode = null;
  let quizIndex = 0;
  let fuzzCaseFound = false;

  function readCompletedMissions() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem('bytesafe-quest-progress-v1') || '[]');
      return new Set(Array.isArray(saved) ? saved.filter((id) => missions.some((mission) => mission.id === id)) : []);
    } catch {
      return new Set();
    }
  }

  function saveCompletedMissions() {
    try {
      const completed = missions.filter((mission) => progress[mission.id].completed).map((mission) => mission.id);
      window.sessionStorage.setItem('bytesafe-quest-progress-v1', JSON.stringify(completed));
    } catch { /* Quest completion remains available for this page session. */ }
  }

  function isByteMission() {
    return ['stack', 'heap', 'fuzzer', 'sanitizer'].includes(activeMission.kind);
  }

  function missionComplete(mission) {
    return progress[mission.id].completed;
  }

  function missionUnlocked(index) {
    // The previous quest must be solved before a new one appears as playable.
    return index === 0 || missionComplete(missions[index - 1]);
  }

  function setGuidedTask(step, title, copy, kicker = `STEP ${step} OF 3`, completed = false) {
    $('#task-kicker').textContent = kicker;
    $('#task-title').textContent = title;
    $('#task-description').textContent = copy;
    document.querySelectorAll('[data-journey-step]').forEach((item) => {
      const itemStep = Number(item.dataset.journeyStep);
      item.classList.toggle('is-current', !completed && itemStep === step);
      item.classList.toggle('is-done', completed || itemStep < step);
    });
  }

  function setByteReadyTask() {
    if (activeMission.kind === 'fuzzer') {
      setGuidedTask(1, 'Run the fuzzer', 'Select “Run fuzzer”. It will try a small set of input lengths and find the shortest one that crosses the parser boundary.');
    } else if (activeMission.kind === 'sanitizer') {
      setGuidedTask(1, 'Run the sanitizer scan', 'The example is ready. Run the simulated scan and read the first unsafe-access report.');
    } else {
      setGuidedTask(1, 'Run the example', 'The example is ready below. Run it once, then inspect the byte map for the value that changed.');
    }
  }

  function parseByteSettings(source) {
    // The code pad recognizes only a bounded buffer declaration and one flag.
    const bufferMatch = source.match(/\bchar\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]/i);
    const checkMatch = source.match(/\bCHECK_LENGTH\s*=\s*(true|false)\b/i);
    if (!bufferMatch || !checkMatch) {
      return { valid: false, error: 'Keep a char buffer such as char name[8] and a CHECK_LENGTH = true/false line.' };
    }
    const capacity = Number(bufferMatch[2]);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 16) {
      return { valid: false, error: 'For this visual model, set the buffer size from 1 to 16.' };
    }
    return { valid: true, buffer: bufferMatch[1], capacity, checked: checkMatch[1].toLowerCase() === 'true', neighbor: activeMission.neighbor };
  }

  function parseUafSettings() {
    const clearMatch = codeEditorUaf.value.match(/\bCLEAR_POINTER\s*=\s*(true|false)\b/i);
    if (!clearMatch) return { valid: false, error: 'Keep a CLEAR_POINTER = true/false line in the code pad.' };
    return { valid: true, clearsPointer: clearMatch[1].toLowerCase() === 'true' };
  }

  function setResult(box, kind, eyebrow, message, tag, icon) {
    box.hidden = false;
    box.className = `result-box result-${kind}`;
    box.querySelector('.result-eyebrow').textContent = eyebrow;
    box.querySelector('.result-copy p').textContent = message;
    box.querySelector('.result-tag').textContent = tag;
    box.querySelector('.result-icon').textContent = icon;
  }

  function setByteModeIndicator(checked, invalid = false) {
    const indicator = $('#mode-indicator');
    indicator.classList.toggle('mode-patched', checked && !invalid);
    indicator.classList.toggle('mode-invalid', invalid);
    const label = invalid ? 'CHECK SETTINGS' : checked ? 'CHECK ON' : 'CHECK OFF';
    $('#mode-label').textContent = label;
    $('#code-summary-status').textContent = invalid ? 'Check settings' : checked ? 'Safety check on' : 'Vulnerable version';
    $('#code-summary-status').classList.toggle('is-patched', checked && !invalid);
    $('#code-summary-status').classList.toggle('is-invalid', invalid);
  }

  function setUafModeIndicator(checked, invalid = false) {
    const indicator = $('#uaf-mode-indicator');
    indicator.classList.toggle('mode-patched', checked && !invalid);
    indicator.classList.toggle('mode-invalid', invalid);
    const label = invalid ? 'CHECK SETTINGS' : checked ? 'POINTER CLEARED' : 'POINTER RETAINED';
    $('#uaf-mode-label').textContent = label;
    $('#uaf-code-summary-status').textContent = invalid ? 'Check settings' : checked ? 'Pointer cleared' : 'Vulnerable version';
    $('#uaf-code-summary-status').classList.toggle('is-patched', checked && !invalid);
    $('#uaf-code-summary-status').classList.toggle('is-invalid', invalid);
  }

  function updateRunButton(config) {
    const label = $('#run-button').querySelector('span');
    if (activeMission.kind === 'fuzzer') label.textContent = fuzzCaseFound ? 'Rerun fuzzer' : 'Run fuzzer';
    else if (activeMission.kind === 'sanitizer') label.textContent = 'Run sanitizer scan';
    else label.textContent = progress[activeMission.id].sawBug && config.valid && config.checked ? 'Verify the fix' : 'Run example';
  }

  function updateModePreview() {
    if (activeMission.kind === 'uaf') {
      const settings = parseUafSettings();
      setUafModeIndicator(settings.clearsPointer, !settings.valid);
      if (timelineStep >= 4 && progress.uaf.sawBug && settings.valid) {
        if (settings.clearsPointer && !progress.uaf.testedFix) {
          setGuidedTask(3, 'Replay with the pointer cleared', 'The setting is on. Reset the timeline, then step through all four events to verify the stale read is blocked.');
        } else if (!settings.clearsPointer) {
          setGuidedTask(2, 'Patch the dangling pointer', 'Open the code editor and change CLEAR_POINTER = false to true. Then replay the timeline.');
        }
      }
      return;
    }
    if (!isByteMission()) return;
    const config = parseByteSettings(codeEditor.value);
    setByteModeIndicator(config.checked, !config.valid);
    updateRunButton(config);
    if (config.valid) {
      payloadInput.maxLength = String(config.capacity + 16);
      const byteCount = new TextEncoder().encode(payloadInput.value).length;
      $('#byte-count').textContent = `${byteCount} ${byteCount === 1 ? 'BYTE' : 'BYTES'}`;
      if (progress[activeMission.id].sawBug && !progress[activeMission.id].completed) {
        if (config.checked && !progress[activeMission.id].testedFix) {
          setGuidedTask(3, 'The check is on. Verify it.', 'Run the same input again. A safe parser rejects it before the write reaches the neighbor.');
        } else if (!config.checked && $('#memory-section').hidden === false) {
          setGuidedTask(2, 'Inspect the changed value', `Look below the buffer divider. Then open Code editor, change CHECK_LENGTH = false to true, and run the same input again.`);
        }
      }
    }
  }

  function renderMissionList() {
    missionList.replaceChildren();
    missions.forEach((mission, index) => {
      const complete = missionComplete(mission);
      const unlocked = missionUnlocked(index);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mission-button${complete ? ' is-complete' : ''}${mission.id === activeMission.id ? ' is-active' : ''}`;
      button.dataset.mission = mission.id;
      button.disabled = !unlocked;
      button.setAttribute('aria-current', mission.id === activeMission.id ? 'step' : 'false');
      button.setAttribute('aria-label', `Quest ${index + 1}: ${mission.label}${complete ? ', complete' : unlocked ? ', available' : ', locked'}`);
      const number = document.createElement('span');
      number.className = 'mission-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const content = document.createElement('span');
      content.className = 'mission-name';
      const name = document.createElement('span');
      name.textContent = mission.label;
      const type = document.createElement('small');
      type.className = 'mission-type';
      type.textContent = mission.type;
      content.append(name, type);
      const state = document.createElement('span');
      state.className = complete ? 'mission-check' : 'mission-lock';
      state.setAttribute('aria-hidden', 'true');
      state.textContent = complete ? '✓' : unlocked ? '›' : 'LOCKED';
      button.append(number, content, state);
      missionList.append(button);
    });
    updateProgress();
  }

  function updateProgress() {
    const done = missions.filter(missionComplete).length;
    const percentage = (done / missions.length) * 100;
    $('#campaign-complete-count').textContent = String(done);
    $('#campaign-rank').textContent = `MEMORY KEEPER · RANK ${Math.min(missions.length, done + 1)}`;
    $('#progress-fill').style.width = `${percentage}%`;
  }

  function updateCompletion() {
    const complete = missionComplete(activeMission);
    const banner = $('#mission-complete-banner');
    banner.hidden = !complete;
    if (complete) {
      const allComplete = missions.every(missionComplete);
      $('#complete-title').textContent = allComplete ? 'Badge earned: Patchwright' : 'Quest cleared';
      $('#complete-copy').textContent = allComplete
        ? 'You restored the archive. You can revisit any unlocked quest from the quest map.'
        : 'You completed the task. The next quest is now unlocked.';
      $('#next-lab-button').querySelector('span').textContent = allComplete ? '✦' : '→';
      $('#next-lab-button').firstChild.textContent = allComplete ? 'Journey complete ' : 'Continue journey ';
      $('#next-lab-button').disabled = allComplete;
    }
    renderMissionList();
  }

  function completeCurrentMission() {
    progress[activeMission.id].completed = true;
    saveCompletedMissions();
    updateCompletion();
  }

  function setDeviceState(alert, detail, visible = true) {
    const card = $('#device-card');
    card.hidden = !visible;
    card.classList.toggle('is-alert', Boolean(alert));
    const status = $('#device-status');
    status.classList.toggle('status-alert', Boolean(alert));
    status.querySelector('span').textContent = alert ? 'CHANGED' : 'SECURE';
    $('#device-detail').textContent = detail || activeMission.deviceDetail;
  }

  function updateMissionCopy() {
    const index = missions.findIndex((mission) => mission.id === activeMission.id) + 1;
    $('#mission-count').textContent = `${String(index).padStart(2, '0')} / ${String(missions.length).padStart(2, '0')}`;
    $('#mission-kicker').textContent = `QUEST ${String(index).padStart(2, '0')} / ${activeMission.type}`;
    $('#mission-title').textContent = activeMission.title;
    $('#mission-description').textContent = activeMission.description;
    $('#mission-objective').textContent = activeMission.objective;
    $('#level-pill').textContent = activeMission.rank;
    $('#notice-title').textContent = activeMission.noticeTitle;
    $('#notice-copy').textContent = activeMission.notice;
    $('#takeaway-copy').textContent = activeMission.takeaway;
    $('#device-name').textContent = activeMission.device;
    $('#device-detail').textContent = activeMission.deviceDetail;
  }

  function resetByteLab() {
    latestByteRun = null;
    fuzzCaseFound = false;
    payloadInput.value = activeMission.initialInput || '';
    $('#input-label').textContent = activeMission.kind === 'fuzzer' ? 'Fuzzer input (filled after scan)' : 'Example input';
    $('#input-help').textContent = activeMission.kind === 'fuzzer'
      ? 'The fuzzer will create a small set of boundary inputs for you.'
      : `This buffer holds ${activeMission.capacity} bytes. ${activeMission.initialInput ? 'The example is ready below.' : 'Run the example to begin.'}`;
    $('#byte-count').textContent = `${new TextEncoder().encode(payloadInput.value).length} BYTES`;
    $('#tool-heading').textContent = activeMission.kind === 'fuzzer' ? 'SEARCH FOR A FAILURE' : activeMission.kind === 'sanitizer' ? 'RUN A SIMULATED SANITIZER' : 'RUN THE EXAMPLE';
    $('#tool-subtitle').textContent = activeMission.kind === 'fuzzer' ? 'The fuzzer will find the smallest failing input.' : activeMission.kind === 'sanitizer' ? 'This scan is a teaching model, not a compiler tool.' : 'The example is ready. You can change it.';
    $('#code-help').textContent = `To patch this quest, change CHECK_LENGTH = false to true.`;
    $('#memory-section').hidden = true;
    $('#result-box').hidden = true;
    $('#code-details').open = false;
    $('.advanced-tools').open = false;
    renderMemory({ buffer: activeMission.buffer, capacity: activeMission.capacity, neighbor: activeMission.neighbor }, null);
    setDeviceState(false, activeMission.deviceDetail, false);
    setByteReadyTask();
    updateModePreview();
  }

  function renderQuizQuestion() {
    const question = activeMission.questions[quizIndex];
    $('#quiz-category').textContent = activeMission.id === 'review' ? 'PATCHWRIGHT REVIEW' : activeMission.type;
    $('#quiz-count').textContent = `QUESTION ${quizIndex + 1} / ${activeMission.questions.length}`;
    $('#quiz-question').textContent = question.prompt;
    $('#quiz-options').replaceChildren();
    $('#quiz-feedback').hidden = true;
    $('#quiz-feedback').className = 'quiz-feedback';
    $('#quiz-next').hidden = true;
    $('#quiz-next').disabled = false;
    $('#quiz-next').querySelector('span').textContent = quizIndex === activeMission.questions.length - 1 ? 'Claim quest key' : 'Next question';
    question.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiz-option';
      button.dataset.answer = String(index);
      const mark = document.createElement('span');
      mark.className = 'quiz-option-mark';
      mark.textContent = String.fromCharCode(65 + index);
      const label = document.createElement('span');
      label.textContent = choice.text;
      button.append(mark, label);
      $('#quiz-options').append(button);
    });
    const finalQuestions = activeMission.questions.length > 1;
    $('.journey-steps').hidden = true;
    setGuidedTask(1, finalQuestions ? 'One review question at a time' : 'Choose the best answer',
      finalQuestions ? 'Pick the safer option. If you miss, you can try again without losing progress.' : 'Choose an answer below. If it is not right, read the hint and try again.',
      `QUESTION ${quizIndex + 1} OF ${activeMission.questions.length}`);
  }

  function answerQuiz(event) {
    const button = event.target.closest('[data-answer]');
    if (!button) return;
    const question = activeMission.questions[quizIndex];
    const answer = question.choices[Number(button.dataset.answer)];
    $('#quiz-options').querySelectorAll('.quiz-option').forEach((option) => option.classList.remove('is-wrong', 'is-correct'));
    const feedback = $('#quiz-feedback');
    feedback.hidden = false;
    feedback.textContent = answer.reply;
    feedback.classList.toggle('is-correct', Boolean(answer.correct));
    feedback.classList.toggle('is-wrong', !answer.correct);
    button.classList.toggle('is-correct', Boolean(answer.correct));
    button.classList.toggle('is-wrong', !answer.correct);
    if (!answer.correct) return;
    $('#quiz-options').querySelectorAll('button').forEach((option) => { option.disabled = true; });
    $('#quiz-next').hidden = false;
    setGuidedTask(2, 'Good. Claim the next step.', activeMission.questions.length > 1
      ? 'Continue to the next review question.'
      : 'Claim the quest key to unlock the next stage of your journey.', `QUESTION ${quizIndex + 1} SOLVED`);
  }

  function advanceQuiz() {
    if (quizIndex < activeMission.questions.length - 1) {
      quizIndex += 1;
      renderQuizQuestion();
      return;
    }
    completeCurrentMission();
    $('.journey-steps').hidden = true;
    setGuidedTask(3, 'Quest cleared', 'The next quest is unlocked in your quest map.', 'QUEST COMPLETE', true);
  }

  function setMission(id) {
    const index = missions.findIndex((mission) => mission.id === id);
    if (index < 0 || !missionUnlocked(index)) return;
    activeMission = missions[index];
    quizIndex = 0;
    timelineStep = 0;
    timelineMode = null;
    latestByteRun = null;
    fuzzCaseFound = false;
    $('#code-details').open = false;
    $('#uaf-code-details').open = false;
    updateMissionCopy();
    const isQuiz = activeMission.kind === 'quiz';
    const isUaf = activeMission.kind === 'uaf';
    $('.journey-steps').hidden = isQuiz;
    quizLab.hidden = !isQuiz;
    byteLab.hidden = !(isByteMission());
    uafLab.hidden = !isUaf;
    $('#mission-complete-banner').hidden = !missionComplete(activeMission);
    setDeviceState(false, activeMission.deviceDetail, false);
    if (isQuiz) {
      renderQuizQuestion();
      $('#result-box').hidden = true;
      $('#uaf-result').hidden = true;
    } else if (isUaf) {
      codeEditorUaf.value = activeMission.code;
      resetUafTimeline();
      updateModePreview();
    } else {
      codeEditor.value = activeMission.code;
      resetByteLab();
    }
    renderMissionList();
  }

  function createCell(label, index, value, neighbor, overflow) {
    const cell = document.createElement('div');
    cell.className = `memory-cell${neighbor ? ' neighbor' : ''}${value !== 0 ? ` written${overflow ? ' overflow-write' : ''}` : ''}`;
    cell.style.setProperty('--stagger', `${Math.min(index, 19) * 24}ms`);
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
    // This bounded drawing is a teaching snapshot, not process memory.
    const host = $('#memory-map');
    host.replaceChildren();
    const capacity = Math.max(1, Math.min(16, config.capacity || activeMission.capacity));
    const buffer = config.buffer || activeMission.buffer;
    const neighbor = config.neighbor || activeMission.neighbor;
    const bufferValues = Array(capacity).fill(0);
    const neighborValues = Array(4).fill(0);
    const neighborOverflow = Array(4).fill(false);
    if (byteRun && byteRun.snapshotCapacity === capacity && byteRun.buffer === buffer) {
      byteRun.visibleBytes.forEach(({ position, value }) => {
        if (position < capacity) bufferValues[position] = value;
        else if (position < capacity + 4) {
          neighborValues[position - capacity] = value;
          neighborOverflow[position - capacity] = true;
        }
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
      range.textContent = isNeighbor ? `+${capacity} to +${(capacity + values.length - 1).toString(16).toUpperCase()}` : `+00 to +${(capacity - 1).toString(16).toUpperCase().padStart(2, '0')}`;
      heading.append(title, range);
      const row = document.createElement('div');
      row.className = 'memory-cells';
      values.forEach((value, index) => row.append(createCell(groupName, isNeighbor ? capacity + index : index, value, isNeighbor, overflowFlags[index])));
      group.append(heading, row);
      host.append(group);
    };
    addGroup(buffer, bufferValues, false, Array(capacity).fill(false));
    const divider = document.createElement('div');
    divider.className = 'overflow-divider';
    divider.textContent = 'BUFFER EDGE';
    host.append(divider);
    addGroup(neighbor, neighborValues, true, neighborOverflow);
    $('#memory-caption-text').textContent = byteRun && byteRun.beyondVisible > 0
      ? `${byteRun.beyondVisible} more byte${byteRun.beyondVisible === 1 ? '' : 's'} passed the visible neighbor cells.`
      : 'The layout is simplified so the boundary is easy to see.';
  }

  function runByteSimulation() {
    const config = parseByteSettings(codeEditor.value);
    setByteModeIndicator(config.checked, !config.valid);
    if (!config.valid) {
      $('#code-details').open = true;
      $('#result-box').hidden = false;
      latestByteRun = null;
      setResult($('#result-box'), 'danger', 'CHECK THE CODE SETTINGS', config.error, 'NO MEMORY CHANGED', 'i');
      return;
    }
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
    $('#result-box').hidden = false;
    $('#memory-section').hidden = false;
    renderMemory(config, latestByteRun);

    if (overflowCount > 0 && config.checked) {
      if (progress[activeMission.id].sawBug) {
        progress[activeMission.id].testedFix = true;
        progress[activeMission.id].completed = true;
        setDeviceState(false, activeMission.deviceDetail);
        setResult($('#result-box'), 'success', 'BOUNDARY CHECK PASSED', `The ${bytes.length}-byte input was rejected before copying. ${config.neighbor} stayed unchanged.`, 'PATCH VERIFIED', '✓');
        setGuidedTask(3, 'Patch verified', 'You saw the boundary failure, then proved the same input is rejected safely.', 'QUEST COMPLETE', true);
      } else {
        setDeviceState(false, activeMission.deviceDetail);
        setResult($('#result-box'), 'success', 'INPUT REJECTED', 'The bounds check blocked this input. For the quest key, first switch the check off and observe why it matters.', 'SAFE CHECK', '✓');
        setGuidedTask(1, 'See the bug first', 'Turn CHECK_LENGTH off in the code editor, run this same example, then patch it again.', 'STEP 1 OF 3');
      }
    } else if (overflowCount > 0) {
      progress[activeMission.id].sawBug = true;
      $('#code-details').open = true;
      setDeviceState(latestByteRun.effect, latestByteRun.effect ? `${config.neighbor.toUpperCase()}: CHANGED` : activeMission.deviceDetail);
      let message = `${bytes.length} bytes entered a ${config.capacity}-byte buffer. ${activeMission.effect}`;
      let eyebrow = 'BUFFER BOUNDARY CROSSED';
      if (activeMission.kind === 'sanitizer') {
        eyebrow = 'SIMULATED ASAN REPORT';
        message = `AddressSanitizer would report a ${activeMission.buffer} write at offset ${config.capacity}, past this ${config.capacity}-byte buffer. No real program was run.`;
      }
      setResult($('#result-box'), 'danger', eyebrow, message, 'SIMULATED BUG', '⚠');
      if (activeMission.kind === 'fuzzer') {
        setGuidedTask(2, 'Inspect the smallest failing input', 'The fuzzer found the first length past the boundary. Open the code editor, turn CHECK_LENGTH on, then rerun the fuzzer.');
      } else {
        setGuidedTask(2, 'Inspect the changed value', `Look below the buffer divider. Then change CHECK_LENGTH = false to true in the code editor and run this same input again.`);
      }
    } else if (bytes.length === 0) {
      setDeviceState(false, activeMission.deviceDetail);
      setResult($('#result-box'), 'idle', 'NO INPUT TO CHECK', 'Add an input, then run the example again.', 'WAITING FOR INPUT', '·');
      setGuidedTask(1, 'Try the example input', 'The field is empty. Use the example or enter a value that is longer than the buffer.');
    } else {
      setDeviceState(false, activeMission.deviceDetail);
      setResult($('#result-box'), 'success', 'INPUT STAYED IN BOUNDS', `${bytes.length} bytes fit in the ${config.capacity}-byte buffer. ${config.neighbor} stayed unchanged.`, 'NO OVERFLOW', '✓');
      setGuidedTask(1, 'Try one more byte', 'This input fits. Add one byte in “Try a different input” to see what happens at the edge.');
    }
    updateCompletion();
    updateRunButton(config);
  }

  function runFuzzer() {
    const config = parseByteSettings(codeEditor.value);
    if (!config.valid) {
      $('#code-details').open = true;
      setResult($('#result-box'), 'danger', 'CHECK THE CODE SETTINGS', config.error, 'NO MEMORY CHANGED', 'i');
      return;
    }
    // A deterministic length sweep models a tiny fuzzer without running any
    // student code or generating traffic. The first failing case is minimal.
    const testedInputs = Array.from({ length: config.capacity + 4 }, (_, index) => 'A'.repeat(index + 1));
    payloadInput.value = testedInputs.find((input) => new TextEncoder().encode(input).length > config.capacity) || '';
    payloadInput.dispatchEvent(new Event('input', { bubbles: true }));
    fuzzCaseFound = true;
    if (!config.checked) {
      runByteSimulation();
      setResult($('#result-box'), 'danger', 'FUZZER FOUND A COUNTEREXAMPLE', `It tried ${testedInputs.length} input lengths. The shortest failure is ${payloadInput.value.length} bytes: “${payloadInput.value}”.`, 'SMALLEST FAILING CASE', '⚠');
      setGuidedTask(2, 'Inspect the smallest failing input', 'Open the code editor, turn CHECK_LENGTH on, then rerun the fuzzer to check the same input set.');
    } else if (progress[activeMission.id].sawBug) {
      runByteSimulation();
      progress[activeMission.id].testedFix = true;
      progress[activeMission.id].completed = true;
      setResult($('#result-box'), 'success', 'FUZZ SET PASSED', `All ${testedInputs.length} modeled input lengths stayed within the checked boundary. Keep the shortest failing case as a regression test.`, 'PATCH VERIFIED', '✓');
      setGuidedTask(3, 'Parser patch verified', 'The minimized failing input now gets rejected before the copy. The next quest is unlocked.', 'QUEST COMPLETE', true);
      updateCompletion();
    } else {
      runByteSimulation();
    }
    updateRunButton(config);
  }

  function codeWithSetting(source, setting, value) {
    const matcher = new RegExp(`(^\\s*${setting}\\s*=\\s*)(true|false)(\\b.*$)`, 'im');
    if (matcher.test(source)) return source.replace(matcher, `$1${value}$3`);
    return `${source.trimEnd()}\n${setting} = ${value};`;
  }

  function loadByteDemo(checkLength) {
    codeEditor.value = codeWithSetting(activeMission.code, 'CHECK_LENGTH', checkLength);
    const config = parseByteSettings(codeEditor.value);
    payloadInput.value = 'A'.repeat(config.valid ? config.capacity + 1 : activeMission.capacity + 1);
    payloadInput.dispatchEvent(new Event('input', { bubbles: true }));
    updateModePreview();
    if (activeMission.kind === 'fuzzer') runFuzzer();
    else runByteSimulation();
  }

  function loadUafDemo(clearPointer) {
    codeEditorUaf.value = codeWithSetting(activeMission.code, 'CLEAR_POINTER', clearPointer);
    timelineStep = 0;
    timelineMode = null;
    resetUafTimeline();
    updateModePreview();
    while (timelineStep < 4) advanceUafTimeline();
  }

  function setTextResultForInvalidUaf(message) {
    setResult($('#uaf-result'), 'danger', 'CHECK THE CODE SETTINGS', message, 'NO POINTER READ', 'i');
  }

  function resetUafTimeline() {
    timelineStep = 0;
    timelineMode = null;
    renderUafTimeline();
    $('#uaf-result').hidden = true;
    $('#uaf-next').disabled = false;
    $('#uaf-next').querySelector('span').textContent = 'Start timeline';
    $('#uaf-instruction').textContent = 'Step through each event to see what the saved pointer refers to.';
    setDeviceState(false, activeMission.deviceDetail, false);
    const settings = parseUafSettings();
    if (progress.uaf.sawBug && settings.valid && settings.clearsPointer && !progress.uaf.testedFix) {
      setGuidedTask(3, 'Replay with the pointer cleared', 'Step through all four events again. The final read should be blocked because the saved pointer is NULL.');
    } else if (progress.uaf.sawBug && !progress.uaf.testedFix) {
      setGuidedTask(3, 'Patch the dangling pointer', 'Open the code editor, change CLEAR_POINTER = false to true, then reset and replay the timeline.');
    } else {
      setGuidedTask(1, 'Start the timeline', 'Select Start timeline. Follow the object and saved pointer through four events.');
    }
  }

  function renderUafTimeline() {
    const timeline = $('#uaf-timeline');
    timeline.replaceChildren();
    const labels = [
      ['01', 'Allocate', 'Live object'],
      ['02', 'Release', 'Lifetime ends'],
      ['03', 'Reuse slot', 'New object'],
      ['04', 'Read pointer', 'Follow address']
    ];
    labels.forEach((step, index) => {
      const card = document.createElement('div');
      const isCurrent = timelineStep === index + 1;
      const isBug = timelineStep >= 2 && index === 1 && timelineMode === false;
      const isFixed = timelineStep >= 2 && index === 1 && timelineMode === true;
      card.className = `timeline-step${isCurrent ? ' is-active' : ''}${isBug ? ' is-bug' : ''}${isFixed ? ' is-fixed' : ''}`;
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
    visual.hidden = timelineStep === 0;
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
    // Switching the modeled cleanup setting starts a fresh four-step story.
    if (timelineMode !== null && timelineMode !== settings.clearsPointer) timelineStep = 0;
    timelineMode = settings.clearsPointer;
    if (timelineStep >= 4) return;
    timelineStep += 1;
    renderUafTimeline();
    if (timelineStep === 1) {
      $('#uaf-instruction').textContent = 'The demo service allocated a status object at address 0x1A20.';
      setResult($('#uaf-result'), 'idle', 'OBJECT ALLOCATED', 'The pointer refers to a live object that reports SAFE.', 'STEP 1 OF 4', '1');
      setGuidedTask(1, 'Object allocated', 'Continue to the next event. The pointer currently refers to the live status object.');
    } else if (timelineStep === 2) {
      const description = settings.clearsPointer ? 'The object was released and the saved pointer was cleared.' : 'The object was released, but the saved pointer still holds its old address.';
      $('#uaf-instruction').textContent = description;
      setResult($('#uaf-result'), settings.clearsPointer ? 'success' : 'danger', settings.clearsPointer ? 'POINTER CLEARED' : 'DANGLING POINTER', settings.clearsPointer ? description : 'The pointer still says 0x1A20, even though the object lifetime has ended.', 'STEP 2 OF 4', settings.clearsPointer ? '✓' : '2');
      setGuidedTask(1, 'The object was released', 'Continue. The allocator may give this address to a different object.');
    } else if (timelineStep === 3) {
      $('#uaf-instruction').textContent = 'The simulated allocator reused address 0x1A20 for a different demo value.';
      setResult($('#uaf-result'), settings.clearsPointer ? 'success' : 'danger', settings.clearsPointer ? 'ADDRESS REUSED SAFELY' : 'ADDRESS REUSED', settings.clearsPointer ? 'The old pointer was cleared, so it cannot reach the new object.' : 'The same address now contains a different object: LOCK_STATE = OPEN.', 'STEP 3 OF 4', '3');
      setGuidedTask(2, 'The same address has new data', 'Inspect the pointer card. What would happen if the old pointer follows this reused address? Continue to test it.');
    } else if (settings.clearsPointer) {
      $('#uaf-instruction').textContent = 'The read was blocked because the pointer is NULL.';
      setResult($('#uaf-result'), 'success', 'STALE READ BLOCKED', 'The simulator refused the read after release. The old object cannot be accessed.', 'STEP 4 OF 4', '✓');
      setDeviceState(false, 'SAFE: STALE READ BLOCKED');
      if (progress.uaf.sawBug) {
        progress.uaf.testedFix = true;
        progress.uaf.completed = true;
        setGuidedTask(3, 'Pointer cleanup verified', 'The cleared pointer blocked the stale read. The next quest is unlocked.', 'QUEST COMPLETE', true);
      } else {
        setGuidedTask(1, 'Show why the fix matters', 'For the quest key, set CLEAR_POINTER to false and replay the timeline to observe the dangling pointer first.');
      }
    } else {
      progress.uaf.sawBug = true;
      $('#uaf-code-details').open = true;
      $('#uaf-instruction').textContent = 'The old pointer read the new object at that reused address.';
      setResult($('#uaf-result'), 'danger', 'USE-AFTER-FREE SIMULATED', 'The stale pointer read LOCK_STATE = OPEN from the reused slot. No real object or device was touched.', 'STEP 4 OF 4', '⚠');
      setDeviceState(true, 'LOCK STATE: OPEN');
      setGuidedTask(2, 'Patch the dangling pointer', 'Open the code editor, change CLEAR_POINTER = false to true, reset the timeline, and replay all four events.');
    }
    $('#uaf-next').querySelector('span').textContent = timelineStep === 4 ? 'Timeline complete' : 'Next step';
    $('#uaf-next').disabled = timelineStep === 4;
    if (timelineStep === 4) updateCompletion();
  }

  function fillPayloadToLimit(addExtraByte) {
    const settings = parseByteSettings(codeEditor.value);
    if (!settings.valid) {
      $('#code-details').open = true;
      setResult($('#result-box'), 'danger', 'CHECK THE CODE SETTINGS', settings.error, 'NO MEMORY CHANGED', 'i');
      codeEditor.focus();
      return;
    }
    payloadInput.value = 'A'.repeat(settings.capacity + (addExtraByte ? 1 : 0));
    payloadInput.dispatchEvent(new Event('input', { bubbles: true }));
    payloadInput.focus();
  }

  function continueCampaign() {
    const index = missions.findIndex((mission) => mission.id === activeMission.id);
    if (!missionComplete(activeMission)) return;
    if (index < missions.length - 1) setMission(missions[index + 1].id);
  }

  missionList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mission]');
    if (!button || button.disabled) return;
    setMission(button.dataset.mission);
    $('.campaign-map').open = false;
  });
  $('#quiz-options').addEventListener('click', answerQuiz);
  $('#quiz-next').addEventListener('click', advanceQuiz);
  codeEditor.addEventListener('input', updateModePreview);
  codeEditorUaf.addEventListener('input', () => {
    const timelineWasComplete = timelineStep >= 4;
    updateModePreview();
    if (timelineWasComplete) resetUafTimeline();
  });
  payloadInput.addEventListener('input', () => {
    const count = new TextEncoder().encode(payloadInput.value).length;
    $('#byte-count').textContent = `${count} ${count === 1 ? 'BYTE' : 'BYTES'}`;
  });
  $('#run-button').addEventListener('click', () => activeMission.kind === 'fuzzer' ? runFuzzer() : runByteSimulation());
  payloadInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') activeMission.kind === 'fuzzer' ? runFuzzer() : runByteSimulation();
  });
  $('#clear-button').addEventListener('click', resetByteLab);
  $('#fill-edge').addEventListener('click', () => fillPayloadToLimit(false));
  $('#fill-overflow').addEventListener('click', () => fillPayloadToLimit(true));
  $('#uaf-next').addEventListener('click', advanceUafTimeline);
  $('#uaf-reset').addEventListener('click', resetUafTimeline);
  $('#next-lab-button').addEventListener('click', continueCampaign);
  $('#facilitator-toggle').addEventListener('click', (event) => {
    const button = event.currentTarget;
    const panel = $('#facilitator-panel');
    const willOpen = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(willOpen));
    panel.hidden = !willOpen;
  });
  $('#host-show-bug').addEventListener('click', () => {
    if (activeMission.kind === 'uaf') loadUafDemo(false);
    else if (isByteMission()) loadByteDemo(false);
    else setGuidedTask(1, 'Use the question to lead the room', 'Ask participants to choose an answer, then discuss the field notes below.');
  });
  $('#host-show-fix').addEventListener('click', () => {
    if (activeMission.kind === 'uaf') loadUafDemo(true);
    else if (isByteMission()) loadByteDemo(true);
    else setGuidedTask(1, 'Discuss a safer choice', 'Invite the room to explain which answer reduces memory risk and how to verify it.');
  });
  $('#host-next').addEventListener('click', () => {
    const index = missions.findIndex((mission) => mission.id === activeMission.id);
    if (index < missions.length - 1 && missionUnlocked(index + 1)) setMission(missions[index + 1].id);
    else setGuidedTask(1, 'Complete this quest first', 'Solve the current task to unlock the next stage of the campaign.');
  });
  $('#host-reset').addEventListener('click', () => setMission(activeMission.id));

  const motionToggle = $('#motion-toggle');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function savedMotionPreference() {
    try { return window.localStorage.getItem('bytesafe-motion'); }
    catch { return null; }
  }
  let motionEnabled = savedMotionPreference() === 'on' ? true : savedMotionPreference() === 'off' ? false : !reducedMotionQuery.matches;
  function applyMotionPreference() {
    document.body.classList.toggle('motion-off', !motionEnabled);
    motionToggle.setAttribute('aria-pressed', String(motionEnabled));
    $('#motion-label').textContent = motionEnabled ? 'Motion on' : 'Motion off';
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
  updateMissionCopy();
  setMission(missions.find((mission) => !missionComplete(mission))?.id || missions[missions.length - 1].id);
})();
