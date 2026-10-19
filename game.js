/* ByteSafe Lab is a local teaching simulation. Editable pseudocode is parsed
   for a few named settings; student text is never compiled or evaluated. */
(() => {
  'use strict';

  // Quest copy, questions, and pseudocode are configuration data for the UI.
  // Each mission kind selects a bounded local mechanic below.
  const missions = [
    {
      id: 'map', label: 'Map the Memory', type: 'MEMORY BASICS', kind: 'memory-map', rank: 'QUEST 1',
      title: 'Map the Memory', device: 'Archive map', deviceDetail: 'ONE CHAR: ONE BYTE',
      description: 'Before you protect the archive, learn how its byte-sized rooms are numbered.',
      objective: 'Place each character at its byte address and predict where the next address begins.',
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
      description: 'An eight-byte packet slot receives valid, malformed, and oversized records. Decide what the parser should accept.',
      objective: 'Classify accepted and malformed packets, then validate both packet size and record shape at the parser boundary.',
      noticeTitle: 'Heap objects can have neighbors too.',
      notice: 'An unchecked write past a dynamically allocated object can affect another nearby value. Allocator layout varies.',
      takeaway: 'Validate packet size and format at the parser boundary.',
      buffer: 'packet', capacity: 8, neighbor: 'alarm_limit',
      effect: 'The overlong packet changed the neighboring alarm setting in this model.',
      initialInput: 'TEMP=2400',
      code: 'char packet[8];\nCHECK_LENGTH = false;\nVALIDATE_TEMP_RECORD = false;\nparse_packet(packet, input);'
    },
    {
      id: 'pointer', label: 'Address Compass', type: 'POINTERS', kind: 'pointer', rank: 'QUEST 4',
      title: 'Address Compass', device: 'Address compass', deviceDetail: 'POINTER: ADDRESS',
      description: 'The archive map points to locations. Follow the address, not the value.',
      objective: 'Predict and trace typed-pointer movement, then identify a one-past target that must not be dereferenced.',
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
      objective: 'Predict the pointer’s lifetime, inspect slot reuse, compare ownership approaches, then verify cleanup.',
      noticeTitle: 'A freed address can change meaning.',
      notice: 'A pointer may still hold an address after an object is released. An allocator can reuse that slot for another object.',
      takeaway: 'Make ownership clear. Reset pointers after release and prefer unique ownership such as unique_ptr.',
      code: 'release(status);\nCLEAR_POINTER = false;\nread(status);'
    },
    {
      id: 'fuzz', label: 'Fuzzing Trail', type: 'PARSER + FUZZER', kind: 'fuzzer', rank: 'QUEST 6',
      title: 'Fuzzing Trail', device: 'Packet parser', deviceDetail: 'PARSER: READY',
      description: 'Investigate a bounded set of generated inputs and retain the smallest failure as a regression case.',
      objective: 'Find and explain the smallest failing input, reproduce it, patch the parser, and retain it as a regression.',
      noticeTitle: 'Fuzzers try many unusual inputs.',
      notice: 'This miniature fuzzer checks increasing input lengths and exposes the shortest failure. Real fuzzers mutate many input formats and minimize cases that fail.',
      takeaway: 'Keep the smallest failing case as a regression test after fixing the parser.',
      buffer: 'packet', capacity: 8, neighbor: 'record_size',
      effect: 'The smallest failing input crossed the parser buffer boundary in this model.',
      initialInput: '',
      code: 'char packet[8];\nCHECK_LENGTH = false;\nparse_bytes(packet, input);'
    },
    {
      id: 'sanitizer', label: 'Sanitizer Scan', type: 'MODELED TRACE', kind: 'sanitizer', rank: 'QUEST 7',
      title: 'Sanitizer Scan', device: 'Cooling monitor', deviceDetail: 'PARSER: CHECKED',
      description: 'A deterministic teaching model can show where this known input crosses the buffer boundary.',
      objective: 'Trace the modeled source line and byte counts, then patch the bounds check and verify the same case.',
      noticeTitle: 'Sanitizers catch unsafe behavior during testing.',
      notice: 'AddressSanitizer can report out-of-bounds access and use-after-free. UBSan reports several kinds of undefined behavior.',
      takeaway: 'Fix the first clear report, then rerun tests with sanitizers enabled.',
      buffer: 'packet', capacity: 6, neighbor: 'alarm_limit',
      effect: 'The diagnostic found a write beyond the packet buffer.',
      initialInput: 'TEMP=OK',
      code: 'char packet[6];\nCHECK_LENGTH = false;\ncopy_bytes(packet, input);'
    },
    {
      id: 'review', label: 'Patchwright Review', type: 'PATCH REVIEW', kind: 'review', rank: 'QUEST 8',
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
  const savedWorkflow = readWorkflowProgress();
  const progress = Object.fromEntries(missions.map((mission) => [mission.id, {
    understood: Boolean(savedWorkflow[mission.id]?.understood),
    sawBug: Boolean(savedWorkflow[mission.id]?.sawBug),
    inspected: Boolean(savedWorkflow[mission.id]?.inspected),
    bugInput: typeof savedWorkflow[mission.id]?.bugInput === 'string' ? savedWorkflow[mission.id].bugInput : null,
    sawFixRun: false,
    fixRunInput: null,
    fixRunCode: null,
    testedFix: false,
    completed: savedCompleted.has(mission.id),
    activities: savedWorkflow[mission.id]?.activities && typeof savedWorkflow[mission.id].activities === 'object'
      ? { ...savedWorkflow[mission.id].activities }
      : {}
  }]));
  let activeMission = missions[0];
  let latestByteRun = null;
  let timelineStep = 0;
  let timelineMode = null;
  let quizIndex = 0;
  let fuzzCaseFound = false;
  let memoryFrame = 0;
  let memoryReplayTimer = null;
  let pointerCurrentIndex = 0;
  let pointerSelectedIndex = null;
  let verificationOutcomes = null;
  let challengeSession = null;
  let challengeTimerHandle = null;
  let challengeHintIndex = 0;
  let challengeReasonCorrect = false;
  let challengeTestPassed = false;
  let presentationMode = false;

  function readCompletedMissions() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem('bytesafe-quest-progress-v1') || '[]');
      return new Set(Array.isArray(saved) ? saved.filter((id) => missions.some((mission) => mission.id === id)) : []);
    } catch {
      return new Set();
    }
  }

  function readWorkflowProgress() {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem('bytesafe-quest-workflow-v1') || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch {
      return {};
    }
  }

  function saveCompletedMissions() {
    try {
      const completed = missions.filter((mission) => progress[mission.id].completed).map((mission) => mission.id);
      window.sessionStorage.setItem('bytesafe-quest-progress-v1', JSON.stringify(completed));
      const workflow = Object.fromEntries(missions.map((mission) => {
        const state = progress[mission.id];
        return [mission.id, {
          understood: state.understood,
          sawBug: state.sawBug,
          inspected: state.inspected,
          bugInput: state.bugInput,
          activities: state.activities
        }];
      }));
      window.sessionStorage.setItem('bytesafe-quest-workflow-v1', JSON.stringify(workflow));
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

  function setGuidedTask(step, title, copy, kicker = `Step ${step} of 5`, completed = false) {
    $('#task-kicker').textContent = kicker;
    $('#task-title').textContent = title;
    $('#task-description').textContent = copy;
    document.querySelectorAll('[data-journey-step]').forEach((item) => {
      const itemStep = Number(item.dataset.journeyStep);
      item.classList.toggle('is-current', !completed && itemStep === step);
      item.classList.toggle('is-done', completed || itemStep < step);
    });
  }

  function setByteWorkflow() {
    const state = progress[activeMission.id];
    if (state.completed) {
      setGuidedTask(5, 'Quest cleared', 'The verified fix is saved for this browser session. You can revisit the simulation at any time.', 'QUEST COMPLETE', true);
      return;
    }
    const activity = state.activities;
    if (activeMission.kind === 'stack' && !state.understood) {
      setGuidedTask(1, 'Understand the boundary', 'A buffer has eight byte positions, numbered from +00. Confirm the goal before making a prediction.', 'STAGE 1 OF 5');
      return;
    }
    if (activeMission.kind === 'stack' && !activity.stackPrediction) {
      setGuidedTask(2, 'Predict the ninth byte', 'Before running the sample, choose what you think the ninth byte will reach. You can revise your prediction after seeing the memory map.', 'PREDICT FIRST');
      return;
    }
    if (activeMission.kind === 'heap' && state.understood && !activity.heapTriageComplete) {
      setGuidedTask(2, 'Triage the packet batch', 'Mark each record as accepted or rejected, then compare your reasoning with the bounded parser model.', 'PACKET TRIAGE');
      return;
    }
    if (activeMission.kind === 'fuzzer' && state.understood && !activity.fuzzCorpusGenerated) {
      setGuidedTask(2, 'Generate test inputs', 'Run the deterministic teaching fuzzer to create a small set of boundary cases.', 'GENERATE CASES');
      return;
    }
    if (activeMission.kind === 'fuzzer' && activity.fuzzCorpusGenerated && !activity.fuzzFindingReviewed) {
      setGuidedTask(2, 'Investigate the corpus', 'Inspect the generated lengths, select the shortest failing input, and explain why it crosses the buffer boundary.', 'INVESTIGATE');
      return;
    }
    if (activeMission.kind === 'fuzzer' && activity.fuzzFindingReviewed && !activity.fuzzExplanationRecorded) {
      setGuidedTask(3, 'Explain the failure', 'Write one sentence describing why the chosen input fails at this capacity. Your own words matter more than a preset answer.', 'REASON ABOUT IT');
      return;
    }
    if (activeMission.kind === 'sanitizer' && state.understood && !activity.sanitizerTraceReady) {
      setGuidedTask(2, 'Create the teaching trace', 'Run the local model once. It will show the source line and byte facts for this fixed case; no sanitizer is invoked.', 'MODEL THE ACCESS');
      return;
    }
    if (activeMission.kind === 'sanitizer' && activity.sanitizerTraceReady && !activity.sanitizerEvidenceReviewed) {
      setGuidedTask(3, 'Interpret the evidence', 'Connect the modeled source line, access type, and byte counts before you edit the safety check.', 'EVIDENCE REVIEW');
      return;
    }
    if (activeMission.kind === 'fuzzer' && state.testedFix && !activity.regressionSaved) {
      setGuidedTask(5, 'Retain the regression case', 'The fix passes the local boundary suite. Save the smallest failing input so future edits can check it again.', 'KEEP THE CASE');
      return;
    }
    const activityReady = activeMission.kind === 'stack' ? activity.stackPrediction
      : activeMission.kind === 'heap' ? activity.heapTriageComplete
        : activeMission.kind === 'fuzzer' ? activity.fuzzFindingReviewed && activity.fuzzExplanationRecorded && activity.regressionSaved
          : activeMission.kind === 'sanitizer' ? activity.sanitizerEvidenceReviewed
            : true;
    if (state.sawBug && state.inspected && state.sawFixRun && state.testedFix && activityReady) {
      setGuidedTask(5, 'Patch verified', 'The same failing input and the supported regression cases passed in the simulator.', 'QUEST COMPLETE', true);
      return;
    }
    if (!state.understood) {
      setGuidedTask(1, state.sawBug ? 'Understand what happened' : 'Understand the goal',
        state.sawBug ? 'The run is available to inspect. Confirm the goal, then select a written neighbor byte to continue.' : activeMission.objective,
        'STAGE 1 OF 5');
      return;
    }
    if (state.inspected) {
      const settings = parseByteSettings(codeEditor.value);
      if (settings.valid && settings.checked && (activeMission.kind !== 'heap' || settings.validateTempRecord)) {
        saveCompletedMissions();
        setGuidedTask(5, 'Retest the fix', 'Run the same input after the edit, then run the simulated test cases. A green setting alone does not verify the patch.', 'STAGE 5 OF 5');
      } else {
        setGuidedTask(4, 'Patch the parser boundary', activeMission.kind === 'heap'
          ? 'Enable both the size check and TEMP record validation before parsing. Then rerun the same overlong packet.'
          : 'Change CHECK_LENGTH = false to true before the copy. Then run the same input again.', 'STAGE 4 OF 5');
      }
      return;
    }
    if (state.sawBug) {
      setGuidedTask(3, 'Inspect the changed memory', 'Step through the copy and select a written simulated neighbor cell. Use its byte offset to explain what crossed the boundary.', 'STAGE 3 OF 5');
      return;
    }
    if (state.understood) {
      setGuidedTask(2, activeMission.kind === 'fuzzer' ? 'Run the fuzzer' : activeMission.kind === 'sanitizer' ? 'Run the teaching model' : 'Run the example',
        activeMission.kind === 'fuzzer' ? (activity.fuzzExplanationRecorded ? 'Run the selected minimal case in the memory model to reproduce the failure.' : 'Generate bounded inputs, inspect their outcomes, and select the shortest failure.') : activeMission.kind === 'sanitizer' ? 'Run the deterministic model to produce a labeled teaching trace, not a sanitizer report.' : 'Run the provided input, then inspect the byte-by-byte result.', 'STAGE 2 OF 5');
      return;
    }
    setGuidedTask(1, 'Understand the goal', activeMission.objective, 'STAGE 1 OF 5');
  }

  function setByteReadyTask() {
    setByteWorkflow();
  }

  function setLearningActivityWorkflow() {
    const state = progress[activeMission.id];
    const activity = state.activities;
    if (state.completed) {
      setGuidedTask(5, 'Quest cleared', 'Your reasoning and trace are saved for this browser session. You can revisit this quest from the map.', 'QUEST COMPLETE', true);
      return;
    }
    if (!state.understood) {
      setGuidedTask(1, 'Understand the goal', activeMission.objective, 'STAGE 1 OF 5');
      return;
    }
    if (activeMission.kind === 'memory-map') {
      setGuidedTask(2, 'Map the byte addresses', 'Select the byte that stores T, then calculate the address immediately after the word.', 'INTERACTIVE MAP');
      return;
    }
    if (activeMission.kind === 'pointer') {
      if (!activity.pointerPredictionReviewed) {
        setGuidedTask(2, 'Predict typed-pointer movement', 'Choose the element reached by ptr + 2 before stepping through the address map.', 'PREDICT FIRST');
      } else if (activity.pointerOnePastReviewed) {
        completeCurrentMission();
      } else if (pointerCurrentIndex === 3) {
        setGuidedTask(4, 'Reason about one-past', 'The pointer value is just beyond the last array element. Decide whether dereferencing it is valid.', 'BOUNDARY REASONING');
      } else if (!(activity.pointerConfirmedIndexes || []).includes(pointerCurrentIndex)) {
        setGuidedTask(3, 'Identify the current target', `Use the displayed address to select the array element at ${pointerCurrentIndex === 0 ? '0x2000' : pointerCurrentIndex === 1 ? '0x2004' : '0x2008'}.`, 'TRACE THE POINTER');
      } else {
        setGuidedTask(3, 'Advance by one int', 'Each step moves four bytes. Advance once, then identify the new target.', 'TRACE THE POINTER');
      }
      return;
    }
    if (activeMission.kind === 'review') {
      if (!activity.reviewMismatchExposed) {
        setGuidedTask(2, 'Find the incomplete case', 'Choose a test where Candidate A’s declared length is allowed but does not match the payload bytes.', 'REVIEW THE PATCH');
      } else if (!activity.reviewPatchAccepted) {
        setGuidedTask(3, 'Choose the complete fix', 'Select the patch that validates both the declared size and the actual payload length, then verify the review cases.', 'VERIFY THE REVIEW');
      }
    }
  }

  function renderAddressMap() {
    const host = $('#address-grid');
    host.replaceChildren();
    const letters = ['C', 'A', 'T', '', '', ''];
    const selectedIndex = progress.map.activities.mapSelectedIndex;
    letters.forEach((letter, index) => {
      const address = 0x1000 + index;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'address-cell';
      cell.dataset.mapIndex = String(index);
      cell.dataset.address = `0x${address.toString(16).toUpperCase()}`;
      cell.setAttribute('aria-pressed', String(selectedIndex === index));
      cell.setAttribute('aria-label', `${letter ? `Character ${letter}` : 'Empty byte'}, address 0x${address.toString(16).toUpperCase()}`);
      const label = document.createElement('span');
      label.textContent = `0x${address.toString(16).toUpperCase()}`;
      const value = document.createElement('b');
      value.textContent = letter || '·';
      const offset = document.createElement('small');
      offset.textContent = `byte +${index}`;
      cell.append(label, value, offset);
      if (letter) cell.classList.add('has-value');
      host.append(cell);
    });
  }

  function renderPointerArray() {
    const host = $('#pointer-array');
    host.replaceChildren();
    const values = ['ALPHA', 'BRAVO', 'CHARLIE'];
    values.forEach((value, index) => {
      const address = 0x2000 + (index * 4);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'pointer-array-cell';
      cell.dataset.pointerIndex = String(index);
      cell.dataset.address = `0x${address.toString(16).toUpperCase()}`;
      cell.setAttribute('aria-label', `Array element ${String.fromCharCode(65 + index)}, value ${value}, address 0x${address.toString(16).toUpperCase()}`);
      const isConfirmed = (progress.pointer.activities.pointerConfirmedIndexes || []).includes(index);
      cell.classList.toggle('is-confirmed', isConfirmed);
      cell.setAttribute('aria-pressed', String(pointerSelectedIndex === index));
      const element = document.createElement('span');
      element.textContent = `element ${String.fromCharCode(65 + index)}`;
      const contents = document.createElement('b');
      contents.textContent = value;
      const location = document.createElement('code');
      location.textContent = `0x${address.toString(16).toUpperCase()}`;
      cell.append(element, contents, location);
      host.append(cell);
    });
    const activity = progress.pointer.activities;
    const pointerAddress = 0x2000 + (pointerCurrentIndex * 4);
    const isCurrentConfirmed = (activity.pointerConfirmedIndexes || []).includes(pointerCurrentIndex);
    $('#pointer-trace-status').textContent = pointerCurrentIndex < 3
      ? `Current pointer value: 0x${pointerAddress.toString(16).toUpperCase()}. ${isCurrentConfirmed ? 'Target confirmed; advance when ready.' : 'Select the element at this address.'}`
      : 'Current pointer value: 0x200C. This is one past the final element; no array cell exists there.';
    $('#pointer-one-past').hidden = pointerCurrentIndex !== 3;
    $('#pointer-confirm-target').disabled = !activity.pointerPredictionReviewed || pointerCurrentIndex >= 3 || pointerSelectedIndex === null || isCurrentConfirmed;
    $('#pointer-advance').disabled = !activity.pointerPredictionReviewed || pointerCurrentIndex >= 3 || !(activity.pointerConfirmedIndexes || []).includes(pointerCurrentIndex);
  }

  function checkMemoryMap() {
    if (!progress.map.understood) {
      $('#memory-map-feedback').textContent = 'Acknowledge the quest goal before checking your address prediction.';
      return;
    }
    const selected = $('#address-grid [aria-pressed="true"]');
    const typedAddress = $('#next-address-prediction').value.trim().toLowerCase().replace(/^0x/, '');
    const rightAddress = /^[0-9a-f]+$/.test(typedAddress) && Number.parseInt(typedAddress, 16) === 0x1003;
    if (!selected || selected.dataset.mapIndex !== '2' || !rightAddress) {
      $('#memory-map-feedback').textContent = 'One part does not match the layout yet. T is the third one-byte character, and the next address follows it by one.';
      return;
    }
    progress.map.activities.mapLayoutReviewed = true;
    progress.map.activities.mapNextAddress = $('#next-address-prediction').value.trim();
    $('#memory-map-feedback').textContent = 'Correct. T is at 0x1002, and the next byte begins at 0x1003.';
    saveCompletedMissions();
    completeCurrentMission();
    setLearningActivityWorkflow();
  }

  function checkStackPrediction() {
    if (!progress.stack.understood) {
      $('#stack-prediction-feedback').textContent = 'Acknowledge the quest goal before recording a prediction.';
      return;
    }
    const correct = $('#stack-offset-prediction').value === '8' && $('#stack-neighbor-prediction').value === 'flag';
    $('#stack-prediction-feedback').textContent = correct
      ? 'Prediction recorded. Now run the example and compare the changed neighbor with your prediction.'
      : 'Try again. The first byte after offsets +00 through +07 is +08; the pictured neighbor is is_admin.';
    if (!correct) return;
    progress.stack.activities.stackPrediction = true;
    progress.stack.activities.stackOffsetChoice = $('#stack-offset-prediction').value;
    progress.stack.activities.stackNeighborChoice = $('#stack-neighbor-prediction').value;
    saveCompletedMissions();
    setByteWorkflow();
  }

  function checkPointerPrediction() {
    if (!progress.pointer.understood) {
      $('#pointer-feedback').textContent = 'Acknowledge the quest goal before checking the prediction.';
      return;
    }
    if ($('#pointer-prediction').value !== '0x2008') {
      $('#pointer-feedback').textContent = 'Not yet. Each step advances by four bytes because the pointed-to type is int.';
      return;
    }
    const activity = progress.pointer.activities;
    activity.pointerPredictionReviewed = true;
    activity.pointerPrediction = $('#pointer-prediction').value;
    activity.pointerConfirmedIndexes = activity.pointerConfirmedIndexes || [];
    pointerCurrentIndex = Number.isInteger(activity.pointerCurrentIndex) ? activity.pointerCurrentIndex : 0;
    activity.pointerCurrentIndex = pointerCurrentIndex;
    $('#pointer-feedback').textContent = 'Prediction confirmed: ptr + 2 points to element C at 0x2008. Trace it one typed step at a time.';
    renderPointerArray();
    saveCompletedMissions();
    setLearningActivityWorkflow();
  }

  function selectPointerTarget(event) {
    const cell = event.target.closest('[data-pointer-index]');
    if (!cell) return;
    const activity = progress.pointer.activities;
    if (!activity.pointerPredictionReviewed) {
      $('#pointer-trace-status').textContent = 'Record your ptr + 2 prediction before beginning the trace.';
      return;
    }
    pointerSelectedIndex = Number(cell.dataset.pointerIndex);
    renderPointerArray();
    $('#pointer-trace-status').textContent = `Selected element ${String.fromCharCode(65 + pointerSelectedIndex)} at ${cell.dataset.address}. Compare it with the current pointer address, then confirm.`;
  }

  function confirmPointerTarget() {
    const activity = progress.pointer.activities;
    if (!activity.pointerPredictionReviewed) {
      $('#pointer-trace-status').textContent = 'Record your ptr + 2 prediction before beginning the trace.';
      return;
    }
    if (pointerSelectedIndex === null) return;
    if (pointerSelectedIndex !== pointerCurrentIndex) {
      $('#pointer-trace-status').textContent = 'That element is not at the current pointer address. Compare the two addresses and try another cell.';
      return;
    }
    activity.pointerConfirmedIndexes = activity.pointerConfirmedIndexes || [];
    if (!activity.pointerConfirmedIndexes.includes(pointerCurrentIndex)) activity.pointerConfirmedIndexes.push(pointerCurrentIndex);
    pointerSelectedIndex = null;
    renderPointerArray();
    $('#pointer-trace-status').textContent = `Confirmed: the pointer refers to element ${String.fromCharCode(65 + pointerCurrentIndex)} at 0x${(0x2000 + pointerCurrentIndex * 4).toString(16).toUpperCase()}.`;
    saveCompletedMissions();
    setLearningActivityWorkflow();
  }

  function advancePointer() {
    const activity = progress.pointer.activities;
    if (!(activity.pointerConfirmedIndexes || []).includes(pointerCurrentIndex) || pointerCurrentIndex >= 3) return;
    pointerCurrentIndex += 1;
    activity.pointerCurrentIndex = pointerCurrentIndex;
    renderPointerArray();
    saveCompletedMissions();
    setLearningActivityWorkflow();
  }

  function checkOnePastDereference() {
    if ($('#pointer-dereference-choice').value !== 'no') {
      $('#pointer-trace-status').textContent = 'The one-past address is outside the array. It may mark the end, but it cannot be dereferenced.';
      return;
    }
    progress.pointer.activities.pointerDereferenceChoice = $('#pointer-dereference-choice').value;
    progress.pointer.activities.pointerOnePastReviewed = true;
    $('#pointer-trace-status').textContent = 'Correct. 0x200C is one past this array: a valid end marker, not a valid element to read.';
    saveCompletedMissions();
    completeCurrentMission();
    setLearningActivityWorkflow();
  }

  function checkUafPrediction() {
    if (!progress.uaf.understood) {
      $('#uaf-prediction-feedback').textContent = 'Acknowledge the quest goal before recording these predictions.';
      return;
    }
    const correct = $('#uaf-release-prediction').value === 'address' && $('#uaf-reuse-prediction').value === 'new';
    $('#uaf-prediction-feedback').textContent = correct
      ? 'Prediction recorded. Step the timeline to see the address survive release and observe the modeled reuse.'
      : 'Review the distinction between an object’s lifetime and the numeric address stored in a separate pointer.';
    if (!correct) return;
    progress.uaf.activities.uafPredictionReviewed = true;
    progress.uaf.activities.uafReleaseChoice = $('#uaf-release-prediction').value;
    progress.uaf.activities.uafReuseChoice = $('#uaf-reuse-prediction').value;
    saveCompletedMissions();
    setUafWorkflow();
  }

  function checkOwnershipChoice() {
    if (!progress.uaf.sawBug || !progress.uaf.inspected) {
      $('#ownership-feedback').textContent = 'Complete the vulnerable timeline and inspect its stale read before comparing ownership approaches.';
      return;
    }
    if ($('#ownership-choice').value !== 'unique') {
      $('#ownership-feedback').textContent = 'Clearing this raw pointer only updates this reference. Consider which approach expresses ownership and releases the object with its owner.';
      return;
    }
    progress.uaf.activities.ownershipReviewed = true;
    $('#ownership-feedback').textContent = 'Right. Clearing can guard this reference; unique ownership makes lifetime and release responsibilities clearer across the program.';
    saveCompletedMissions();
    setUafWorkflow();
  }

  function runReviewTest() {
    if (!progress.review.understood) {
      $('#review-test-feedback').textContent = 'Acknowledge the review goal before running a case.';
      return;
    }
    const selected = progress.review.activities.reviewSelectedTest;
    if (!selected) return;
    const testCases = {
      valid: { declared: 3, payloadBytes: 3, payload: 'ABC' },
      mismatch: { declared: 8, payloadBytes: 3, payload: 'ABC' },
      'too-large': { declared: 9, payloadBytes: 9, payload: 'ABCDEFGHI' }
    };
    const test = testCases[selected];
    const candidateAAccepts = test.declared <= 8;
    const outOfPayloadRead = candidateAAccepts && test.declared > test.payloadBytes;
    if (outOfPayloadRead) {
      progress.review.activities.reviewMismatchExposed = true;
      $('#review-test-feedback').textContent = `Candidate A accepts declared=${test.declared} because it fits the buffer, then attempts to copy ${test.declared} bytes from a ${test.payloadBytes}-byte payload. This bounded review model flags the mismatch; it does not run compiled code.`;
      $('#review-final-check').hidden = false;
      saveCompletedMissions();
      setLearningActivityWorkflow();
      return;
    }
    $('#review-test-feedback').textContent = selected === 'too-large'
      ? 'Candidate A rejects this case because the declared length exceeds eight. It does not test whether a smaller declaration matches the payload.'
      : 'Candidate A accepts this well-formed case. It is a useful valid regression, but it does not expose the mismatch edge case.';
  }

  function checkReviewFix() {
    progress.review.activities.reviewFixChoice = $('#review-fix-choice').value;
    if (!progress.review.understood || !progress.review.activities.reviewMismatchExposed) {
      $('#review-fix-feedback').textContent = 'First run the mismatched-length case against Candidate A so the missing check is visible.';
      return;
    }
    if ($('#review-fix-choice').value !== 'b') {
      $('#review-fix-feedback').textContent = 'Candidate A trusts the declared length without comparing it with available payload bytes. Reconsider the mismatch case.';
      return;
    }
    const activity = progress.review.activities;
    const suite = [
      { declared: 3, payloadBytes: 3, shouldAccept: true },
      { declared: 8, payloadBytes: 3, shouldAccept: false },
      { declared: 9, payloadBytes: 9, shouldAccept: false }
    ];
    const passed = suite.every((test) => {
      const accepted = test.declared <= 8 && test.declared === test.payloadBytes;
      return accepted === test.shouldAccept;
    });
    if (!passed) return;
    activity.reviewPatchAccepted = true;
    $('#review-fix-feedback').textContent = 'Candidate B passes the local review suite: valid input is accepted, the length mismatch is rejected, and an oversized declaration is rejected.';
    saveCompletedMissions();
    completeCurrentMission();
    setLearningActivityWorkflow();
  }

  function parseByteSettings(source, mission = activeMission) {
    // The code pad recognizes a bounded buffer declaration and the safety settings this lab models.
    const bufferMatch = source.match(/\bchar\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]/i);
    const checkMatch = source.match(/\bCHECK_LENGTH\s*=\s*(true|false)\b/i);
    const recordMatch = source.match(/\bVALIDATE_TEMP_RECORD\s*=\s*(true|false)\b/i);
    if (!bufferMatch || !checkMatch || (mission.kind === 'heap' && !recordMatch)) {
      return { valid: false, error: 'Keep the buffer declaration and CHECK_LENGTH setting. Heap Courier also needs VALIDATE_TEMP_RECORD = true/false.' };
    }
    const capacity = Number(bufferMatch[2]);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 16) {
      return { valid: false, error: 'For this visual model, set the buffer size from 1 to 16.' };
    }
    return {
      valid: true,
      buffer: bufferMatch[1],
      capacity,
      checked: checkMatch[1].toLowerCase() === 'true',
      validateTempRecord: recordMatch ? recordMatch[1].toLowerCase() === 'true' : false,
      neighbor: mission.neighbor
    };
  }

  // The visual example, regression cases, and event challenge all use the same
  // pure simulator so a displayed pass always comes from supported behavior.
  function evaluateByteInput(input, config) {
    if (!config.valid) return { valid: false, error: config.error };
    const bytes = Array.from(new TextEncoder().encode(input));
    const overflowCount = Math.max(0, bytes.length - config.capacity);
    const blocked = config.checked && overflowCount > 0;
    const visibleBytes = blocked ? [] : bytes.slice(0, config.capacity + 4).map((value, position) => ({ position, value }));
    return {
      valid: true,
      buffer: config.buffer,
      capacity: config.capacity,
      neighbor: config.neighbor,
      bytes,
      visibleBytes,
      overflowCount,
      beyondVisible: Math.max(0, bytes.length - (config.capacity + 4)),
      blocked,
      checked: config.checked,
      effect: !blocked && overflowCount > 0 && bytes[config.capacity] !== 0,
      payloadBytes: bytes.length,
      inputValue: input
    };
  }

  function isValidTempRecord(input) {
    return /^TEMP=\d{1,4}$/.test(input);
  }

  function evaluateHeapPacket(input, config) {
    const bytes = Array.from(new TextEncoder().encode(input));
    const overflowCount = Math.max(0, bytes.length - config.capacity);
    const formatValid = isValidTempRecord(input);
    const lengthBlocked = config.checked && overflowCount > 0;
    const formatBlocked = config.validateTempRecord && !formatValid;
    const blocked = lengthBlocked || formatBlocked;
    return {
      ...evaluateByteInput(input, { ...config, checked: false }),
      visibleBytes: blocked ? [] : bytes.slice(0, config.capacity + 4).map((value, position) => ({ position, value })),
      overflowCount,
      blocked,
      checked: config.checked,
      formatValid,
      parseAccepted: !blocked,
      lengthBlocked,
      formatBlocked,
      rejectionReason: lengthBlocked ? 'The packet exceeds the eight-byte limit.' : formatBlocked ? 'The packet does not match TEMP= followed by one to four digits.' : ''
    };
  }

  function byteTestCases(capacity) {
    return [
      { id: 'empty', label: 'Empty input', value: '', expected: 'No bytes are written.' },
      { id: 'short', label: 'Valid input', value: 'A'.repeat(Math.max(1, capacity - 1)), expected: 'A shorter value stays inside the buffer.' },
      { id: 'boundary', label: 'At the boundary', value: 'A'.repeat(capacity), expected: 'An input exactly at capacity is accepted.' },
      { id: 'overflow', label: 'One byte over', value: 'A'.repeat(capacity + 1), expected: 'Oversized input is rejected before the copy.' }
    ];
  }

  function heapParserTestCases() {
    return [
      { id: 'short', label: 'Short valid record', value: 'TEMP=7', accept: true },
      { id: 'valid', label: 'Valid record', value: 'TEMP=24', accept: true },
      { id: 'boundary', label: 'Eight-byte boundary', value: 'TEMP=999', accept: true },
      { id: 'missing', label: 'Missing value', value: 'TEMP=', accept: false },
      { id: 'unknown', label: 'Unknown field', value: 'MODE=24', accept: false },
      { id: 'oversized', label: 'Nine-byte valid-shape record', value: 'TEMP=2400', accept: false }
    ];
  }

  function clearVerificationResults(message = 'Tests have not run.') {
    verificationOutcomes = null;
    $('#verification-summary').textContent = message;
    $('#verification-list').replaceChildren();
  }

  function markVerificationResultsStale() {
    if (!verificationOutcomes) return;
    clearVerificationResults('Code or input changed. Run the test cases again to verify the current version.');
    progress[activeMission.id].testedFix = false;
    if (activeMission.kind === 'fuzzer') $('#fuzz-regression-save').hidden = true;
    saveCompletedMissions();
  }

  function markSimulationStale() {
    if (!latestByteRun) return;
    const inputChanged = latestByteRun.inputValue !== payloadInput.value;
    const codeChanged = latestByteRun.codeSnapshot !== codeEditor.value;
    $('#run-stale').hidden = !(inputChanged || codeChanged);
    if (inputChanged || codeChanged) {
      progress[activeMission.id].sawFixRun = false;
      progress[activeMission.id].fixRunInput = null;
      progress[activeMission.id].fixRunCode = null;
      progress[activeMission.id].testedFix = false;
      if (activeMission.kind === 'sanitizer' && !progress.sanitizer.activities.sanitizerEvidenceReviewed) {
        progress.sanitizer.activities.sanitizerTraceReady = false;
        $('#sanitizer-evidence').hidden = true;
      }
      saveCompletedMissions();
    }
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
    if (activeMission.kind === 'fuzzer') {
      const activity = progress.fuzz.activities;
      const canRun = !activity.fuzzCorpusGenerated || (activity.fuzzFindingReviewed && activity.fuzzExplanationRecorded);
      $('#run-button').disabled = !canRun;
      label.textContent = !activity.fuzzCorpusGenerated ? 'Generate case set'
        : !activity.fuzzFindingReviewed ? 'Select the shortest failure'
          : !activity.fuzzExplanationRecorded ? 'Record your explanation'
            : progress.fuzz.sawBug && config.valid && config.checked ? 'Verify selected case' : 'Run selected case';
    } else if (activeMission.kind === 'sanitizer') {
      $('#run-button').disabled = false;
      label.textContent = progress.sanitizer.activities.sanitizerTraceReady ? 'Run teaching model' : 'Create teaching trace';
    } else if (activeMission.kind === 'heap') {
      $('#run-button').disabled = false;
      label.textContent = progress.heap.sawBug && config.valid && config.checked && config.validateTempRecord ? 'Verify parser fix' : 'Run packet';
    } else {
      $('#run-button').disabled = false;
      label.textContent = progress[activeMission.id].sawBug && config.valid && config.checked ? 'Verify the fix' : 'Run example';
    }
  }

  function updateModePreview() {
    if (activeMission.kind === 'uaf') {
      const settings = parseUafSettings();
      setUafModeIndicator(settings.clearsPointer, !settings.valid);
      setUafWorkflow();
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
    }
    setByteWorkflow();
  }

  function setUafWorkflow() {
    const state = progress.uaf;
    const settings = parseUafSettings();
    if (state.completed) {
      setGuidedTask(5, 'Quest cleared', 'The pointer cleanup is verified for this browser session. You can replay the timeline at any time.', 'QUEST COMPLETE', true);
    } else if (!state.understood) {
      setGuidedTask(1, state.sawBug ? 'Understand what happened' : 'Understand the goal',
        state.sawBug ? 'Review the observed pointer state. Confirm the goal before marking the stale read inspected.' : activeMission.objective,
        'STAGE 1 OF 5');
    } else if (!state.activities.uafPredictionReviewed) {
      setGuidedTask(2, 'Predict the pointer state', 'Make a prediction about the pointer after release and after the slot is reused, then compare it with the timeline.', 'PREDICT FIRST');
    } else if (state.sawBug && state.inspected && !state.activities.ownershipReviewed) {
      setGuidedTask(4, 'Compare ownership approaches', 'The local nulling switch models one pointer. Choose a practice that gives object lifetime a clear owner before you patch.', 'OWNERSHIP REVIEW');
    } else if (state.sawBug && state.inspected && settings.valid && settings.clearsPointer) {
      setGuidedTask(5, 'Retest the pointer cleanup', 'Reset the timeline, then step through all four events. The final stale read must be blocked.', 'STAGE 5 OF 5');
    } else if (state.sawBug && state.inspected) {
      setGuidedTask(4, 'Patch the dangling pointer', 'Change CLEAR_POINTER = false to true, then reset and replay the timeline.', 'STAGE 4 OF 5');
    } else if (state.sawBug) {
      setGuidedTask(3, 'Inspect the stale pointer', 'Review the reused address and final read. Confirm what the old pointer now refers to before patching.', 'STAGE 3 OF 5');
    } else if (state.understood) {
      setGuidedTask(2, 'Run the timeline', 'Step through allocation, release, slot reuse, and the pointer read.', 'STAGE 2 OF 5');
    } else {
      setGuidedTask(1, 'Understand the goal', activeMission.objective, 'STAGE 1 OF 5');
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
      state.textContent = complete ? '✓' : unlocked ? '›' : 'LOCK';
      state.setAttribute('aria-label', complete ? 'Completed' : unlocked ? 'Available' : 'Locked');
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
      const badgeEarned = allComplete && activeMission.id === missions[missions.length - 1].id;
      $('#complete-title').textContent = badgeEarned ? 'Badge earned: Patchwright' : 'Quest cleared';
      $('#complete-copy').textContent = badgeEarned
        ? 'You restored the archive. You can revisit any unlocked quest from the quest map.'
        : allComplete
          ? 'The campaign is complete. Select a quest from the map to review it.'
          : 'You completed the task. The next quest is now unlocked.';
      $('#next-lab-button').querySelector('span').textContent = '→';
      $('#next-lab-button').firstChild.textContent = allComplete ? 'Review quests ' : 'Continue journey ';
      $('#next-lab-button').disabled = false;
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
    stopMemoryReplay();
    latestByteRun = null;
    memoryFrame = 0;
    fuzzCaseFound = false;
    clearVerificationResults();
    payloadInput.value = activeMission.initialInput || '';
    if (activeMission.kind === 'fuzzer' && progress.fuzz.activities.fuzzFindingReviewed) {
      payloadInput.value = 'A'.repeat(progress.fuzz.activities.fuzzSelectedLength || activeMission.capacity + 1);
    }
    $('#input-label').textContent = activeMission.kind === 'fuzzer' ? 'Fuzzer input (filled after scan)' : 'Example input';
    $('#input-help').textContent = activeMission.kind === 'fuzzer'
      ? 'The fuzzer will create a small set of boundary inputs for you.'
      : `This buffer holds ${activeMission.capacity} bytes. ${activeMission.initialInput ? 'The example is ready below.' : 'Run the example to begin.'}`;
    $('#byte-count').textContent = `${new TextEncoder().encode(payloadInput.value).length} BYTES`;
    $('#tool-heading').textContent = activeMission.kind === 'fuzzer' ? 'Investigate generated cases' : activeMission.kind === 'sanitizer' ? 'Build a teaching trace' : activeMission.kind === 'heap' ? 'Test the packet parser' : 'Run the example';
    $('#tool-subtitle').textContent = activeMission.kind === 'fuzzer' ? 'A deterministic local input set; not production fuzzing.' : activeMission.kind === 'sanitizer' ? 'A bounded simulation; no compiler or sanitizer runs.' : activeMission.kind === 'heap' ? 'Try accepted and malformed records against the modeled parser.' : 'The example is ready. You can change it.';
    $('#code-help').textContent = activeMission.kind === 'heap'
      ? 'Patch both settings: CHECK_LENGTH and VALIDATE_TEMP_RECORD.'
      : 'To patch this quest, change CHECK_LENGTH = false to true.';
    $('#memory-section').hidden = true;
    $('#result-box').hidden = true;
    $('#run-stale').hidden = true;
    $('#verification-panel').hidden = true;
    $('#verification-panel').open = false;
    $('#run-verification-tests').textContent = activeMission.kind === 'heap' ? 'Run 6 tests' : activeMission.kind === 'fuzzer' ? 'Run 5 tests' : 'Run 4 tests';
    $('#fuzz-regression-save').hidden = true;
    $('#memory-inspection-message').textContent = 'Choose a changed neighbor byte to mark the result inspected.';
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
    $('#acknowledge-goal').hidden = true;
    $('#challenge-launch').hidden = true;
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
    memoryFrame = 0;
    stopMemoryReplay();
    fuzzCaseFound = false;
    if (missions[index].kind === 'sanitizer' && !progress.sanitizer.completed && !progress.sanitizer.activities.sanitizerEvidenceReviewed) {
      progress.sanitizer.activities.sanitizerTraceReady = false;
    }
    $('#code-details').open = false;
    $('#uaf-code-details').open = false;
    updateMissionCopy();
    const isQuiz = activeMission.kind === 'quiz';
    const isUaf = activeMission.kind === 'uaf';
    $('.journey-steps').hidden = isQuiz || ['memory-map', 'pointer', 'review'].includes(activeMission.kind);
    $('.task-actions').hidden = isQuiz;
    $('#acknowledge-goal').hidden = isQuiz || progress[activeMission.id].understood;
    $('#challenge-launch').hidden = activeMission.id !== 'stack';
    quizLab.hidden = !isQuiz;
    byteLab.hidden = !(isByteMission());
    uafLab.hidden = !isUaf;
    $('#memory-map-activity').hidden = activeMission.kind !== 'memory-map';
    $('#stack-prediction-activity').hidden = activeMission.kind !== 'stack';
    $('#heap-triage-activity').hidden = activeMission.kind !== 'heap';
    $('#fuzz-investigation').hidden = activeMission.kind !== 'fuzzer';
    $('#sanitizer-evidence').hidden = activeMission.kind !== 'sanitizer' || !progress[activeMission.id].activities.sanitizerTraceReady;
    $('#pointer-activity').hidden = activeMission.kind !== 'pointer';
    $('#uaf-prediction-activity').hidden = !isUaf || progress.uaf.activities.uafPredictionReviewed;
    $('#ownership-review').hidden = !isUaf || !progress.uaf.sawBug || !progress.uaf.inspected;
    $('#patch-review-activity').hidden = activeMission.kind !== 'review';
    $('#review-final-check').hidden = !progress.review.activities.reviewMismatchExposed;
    setDeviceState(false, activeMission.deviceDetail, false);
    if (isQuiz) {
      renderQuizQuestion();
      $('#result-box').hidden = true;
      $('#uaf-result').hidden = true;
    } else if (isUaf) {
      $('.task-actions').hidden = false;
      codeEditorUaf.value = activeMission.code;
      $('#uaf-release-prediction').value = progress.uaf.activities.uafReleaseChoice || '';
      $('#uaf-reuse-prediction').value = progress.uaf.activities.uafReuseChoice || '';
      resetUafTimeline();
      updateModePreview();
      $('#ownership-choice').value = progress.uaf.activities.ownershipReviewed ? 'unique' : '';
    } else if (activeMission.kind === 'memory-map') {
      $('.task-actions').hidden = false;
      renderAddressMap();
      $('#next-address-prediction').value = progress.map.activities.mapNextAddress || '';
      setLearningActivityWorkflow();
    } else if (activeMission.kind === 'pointer') {
      $('.task-actions').hidden = false;
      pointerCurrentIndex = Number.isInteger(progress.pointer.activities.pointerCurrentIndex) ? progress.pointer.activities.pointerCurrentIndex : 0;
      pointerSelectedIndex = null;
      $('#pointer-prediction').value = progress.pointer.activities.pointerPrediction || '';
      $('#pointer-dereference-choice').value = progress.pointer.activities.pointerDereferenceChoice || '';
      renderPointerArray();
      setLearningActivityWorkflow();
    } else if (activeMission.kind === 'review') {
      $('.task-actions').hidden = false;
      $('#review-fix-choice').value = progress.review.activities.reviewFixChoice || '';
      const selectedReviewTest = progress.review.activities.reviewSelectedTest;
      $('#review-test-choices').querySelectorAll('[data-review-test]').forEach((button) => {
        const isSelected = button.dataset.reviewTest === selectedReviewTest;
        button.classList.toggle('is-selected', isSelected);
        button.setAttribute('aria-pressed', String(isSelected));
      });
      $('#run-review-test').disabled = !selectedReviewTest;
      setLearningActivityWorkflow();
    } else {
      $('.task-actions').hidden = false;
      codeEditor.value = activeMission.code;
      codeEditor.readOnly = activeMission.kind === 'sanitizer' && !progress.sanitizer.activities.sanitizerEvidenceReviewed;
      resetByteLab();
      if (activeMission.kind === 'stack') {
        $('#stack-offset-prediction').value = progress.stack.activities.stackOffsetChoice || '';
        $('#stack-neighbor-prediction').value = progress.stack.activities.stackNeighborChoice || '';
      }
      if (activeMission.kind === 'heap') {
        const selections = progress.heap.activities.heapSelections || {};
        Object.entries(selections).forEach(([caseId, answer]) => {
          const card = document.querySelector(`[data-heap-case="${caseId}"]`);
          if (answer) {
            const input = card.querySelector(`input[value="${answer}"]`);
            if (input) input.checked = true;
          }
          card.classList.toggle('is-correct', Boolean(progress.heap.activities.heapTriageComplete));
          card.classList.toggle('is-incorrect', Boolean(selections[caseId]) && !progress.heap.activities.heapTriageComplete);
        });
      }
      if (activeMission.kind === 'fuzzer' && progress.fuzz.activities.fuzzCorpusGenerated) renderFuzzCorpus();
    }
    updateCompletion();
  }

  function createCell(label, index, value, neighbor, written, overflow) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `memory-cell${neighbor ? ' neighbor' : ''}${written ? ' written' : ''}${overflow ? ' overflow-write' : ''}${overflow && index === memoryFrame - 1 ? ' is-current-write' : ''}`;
    cell.disabled = !overflow;
    cell.dataset.position = String(index);
    cell.dataset.overflowWrite = String(Boolean(overflow));
    cell.style.setProperty('--stagger', `${Math.min(index, 19) * 24}ms`);
    cell.setAttribute('aria-label', `Simulated ${neighbor ? 'neighbor' : 'buffer'} ${label}, byte offset ${index}, value ${value.toString(16).padStart(2, '0')}${written ? ', written in this frame' : ', unchanged'}${overflow ? ', written past the buffer boundary, select to inspect' : ''}`);
    cell.setAttribute('aria-pressed', 'false');
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
    const memorySection = $('#memory-section');
    memorySection.classList.toggle('is-write-blocked', Boolean(byteRun?.blocked));
    $('#memory-capacity-label').textContent = `Valid buffer capacity: ${capacity} ${capacity === 1 ? 'byte' : 'bytes'}`;
    const bufferValues = Array(capacity).fill(0);
    const neighborValues = Array(4).fill(0);
    const bufferWritten = Array(capacity).fill(false);
    const neighborWritten = Array(4).fill(false);
    const neighborOverflow = Array(4).fill(false);
    const visibleCount = byteRun && byteRun.snapshotCapacity === capacity && byteRun.buffer === buffer
      ? Math.max(0, Math.min(byteRun.visibleBytes.length, memoryFrame)) : 0;
    if (byteRun && byteRun.snapshotCapacity === capacity && byteRun.buffer === buffer) {
      byteRun.visibleBytes.filter(({ position }) => position < visibleCount).forEach(({ position, value }) => {
        if (position < capacity) {
          bufferValues[position] = value;
          bufferWritten[position] = true;
        }
        else if (position < capacity + 4) {
          neighborValues[position - capacity] = value;
          neighborWritten[position - capacity] = true;
          neighborOverflow[position - capacity] = true;
        }
      });
    }
    const addGroup = (groupName, values, isNeighbor, writtenFlags, overflowFlags) => {
      const group = document.createElement('div');
      group.className = `memory-group ${isNeighbor ? 'is-neighbor' : 'is-buffer'}`;
      const heading = document.createElement('div');
      heading.className = 'memory-group-label';
      const title = document.createElement('span');
      title.className = 'group-name';
      title.textContent = groupName;
      const range = document.createElement('span');
      range.textContent = isNeighbor
        ? `+${capacity.toString(16).toUpperCase().padStart(2, '0')} to +${(capacity + values.length - 1).toString(16).toUpperCase().padStart(2, '0')}`
        : `+00 to +${(capacity - 1).toString(16).toUpperCase().padStart(2, '0')}`;
      heading.append(title, range);
      const row = document.createElement('div');
      row.className = 'memory-cells';
      row.style.setProperty('--memory-columns', String(values.length));
      values.forEach((value, index) => row.append(createCell(groupName, isNeighbor ? capacity + index : index, value, isNeighbor, writtenFlags[index], overflowFlags[index])));
      group.append(heading, row);
      host.append(group);
    };
    addGroup(buffer, bufferValues, false, bufferWritten, Array(capacity).fill(false));
    const divider = document.createElement('div');
    divider.className = `overflow-divider${byteRun?.blocked ? ' is-blocked' : ''}`;
    divider.textContent = byteRun?.blocked
      ? 'WRITE BLOCKED · ZERO BYTES ENTERED'
      : `BUFFER EDGE · FIRST NEIGHBOR AT +${capacity.toString(16).toUpperCase().padStart(2, '0')}`;
    host.append(divider);
    addGroup(neighbor, neighborValues, true, neighborWritten, neighborOverflow);
    $('#memory-frame-status').textContent = !byteRun
      ? 'No simulation yet'
      : byteRun.blocked
        ? 'Length check stopped the copy · 0 bytes written'
        : visibleCount === 0
          ? `Initial state · 0 of ${byteRun.visibleBytes.length} bytes copied`
          : `Write ${visibleCount} of ${byteRun.visibleBytes.length} · offset +${(visibleCount - 1).toString(16).toUpperCase().padStart(2, '0')}`;
    $('#memory-previous').disabled = visibleCount <= 0;
    $('#memory-next').disabled = !byteRun || byteRun.blocked || visibleCount >= byteRun.visibleBytes.length;
    $('#memory-replay').disabled = !byteRun || byteRun.blocked || byteRun.visibleBytes.length === 0;
    $('#memory-reset-view').disabled = !byteRun || memoryFrame === 0;
    $('#memory-caption-text').textContent = byteRun && byteRun.beyondVisible > 0
      ? `${byteRun.beyondVisible} more byte${byteRun.beyondVisible === 1 ? '' : 's'} passed the visible neighbor cells.`
      : byteRun?.blocked
        ? 'The check rejected the input before any write. Neighbor cells are unchanged.'
        : visibleCount === 0
          ? 'Initial teaching state. Step forward to watch each byte enter the model.'
          : 'The layout is a simplified teaching model; real variable order and memory layout vary.';
  }

  function stopMemoryReplay() {
    if (memoryReplayTimer !== null) window.clearInterval(memoryReplayTimer);
    memoryReplayTimer = null;
    $('#memory-frame-status').setAttribute('aria-live', 'polite');
  }

  function setMemoryFrame(frame) {
    if (!latestByteRun) return;
    stopMemoryReplay();
    memoryFrame = Math.max(0, Math.min(latestByteRun.visibleBytes.length, frame));
    renderMemory({ buffer: latestByteRun.buffer, capacity: latestByteRun.capacity, neighbor: latestByteRun.neighbor }, latestByteRun);
  }

  function replayMemory() {
    if (!latestByteRun || latestByteRun.blocked || latestByteRun.visibleBytes.length === 0) return;
    stopMemoryReplay();
    setMemoryFrame(0);
    if (!motionEnabled) {
      setMemoryFrame(latestByteRun.visibleBytes.length);
      return;
    }
    // Avoid announcing every automatically animated byte to screen readers.
    $('#memory-frame-status').setAttribute('aria-live', 'off');
    memoryReplayTimer = window.setInterval(() => {
      if (memoryFrame >= latestByteRun.visibleBytes.length) {
        stopMemoryReplay();
        return;
      }
      memoryFrame += 1;
      renderMemory({ buffer: latestByteRun.buffer, capacity: latestByteRun.capacity, neighbor: latestByteRun.neighbor }, latestByteRun);
    }, 400);
  }

  function renderSanitizerTrace(config, outcome) {
    const sourceLines = codeEditor.value.split(/\r?\n/);
    const accessLine = Math.max(1, sourceLines.findIndex((line) => /copy_bytes\s*\(|parse_packet\s*\(/.test(line)) + 1);
    $('#sanitizer-case-code').textContent = sourceLines.map((line, index) => `${String(index + 1).padStart(2, '0')}  ${line}`).join('\n');
    const lineChoice = $('#sanitizer-line-choice');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a line';
    const lineOptions = sourceLines.map((line, index) => {
      const option = document.createElement('option');
      option.value = String(index + 1);
      option.textContent = `Line ${index + 1} · ${line.trim() || '(blank line)'}`;
      return option;
    });
    lineChoice.replaceChildren(placeholder, ...lineOptions);
    const facts = [
      ['Model state', outcome.blocked ? 'rejected before copy' : outcome.overflowCount ? 'copy crosses boundary' : 'inside buffer'],
      ['Source line', `line ${accessLine} · ${sourceLines[accessLine - 1] || 'copy operation'}`],
      ['Buffer range', `+00 to +${(config.capacity - 1).toString(16).toUpperCase().padStart(2, '0')}`],
      ['Input length', `${outcome.payloadBytes} bytes`],
      ['First outside offset', outcome.overflowCount && !outcome.blocked ? `+${config.capacity.toString(16).toUpperCase().padStart(2, '0')}` : 'none']
    ];
    const list = $('#sanitizer-trace-facts');
    list.replaceChildren();
    facts.forEach(([label, value]) => {
      const term = document.createElement('dt');
      term.textContent = label;
      const detail = document.createElement('dd');
      detail.textContent = value;
      const wrapper = document.createElement('div');
      wrapper.append(term, detail);
      list.append(wrapper);
    });
    $('#sanitizer-evidence').hidden = false;
    progress.sanitizer.activities.sanitizerTraceReady = true;
    saveCompletedMissions();
  }

  function runByteSimulation() {
    stopMemoryReplay();
    const config = parseByteSettings(codeEditor.value);
    const state = progress[activeMission.id];
    setByteModeIndicator(config.checked, !config.valid);
    if (!config.valid) {
      $('#code-details').open = true;
      $('#result-box').hidden = false;
      $('#memory-section').hidden = true;
      latestByteRun = null;
      setResult($('#result-box'), 'danger', 'CHECK THE CODE SETTINGS', config.error, 'NO MEMORY CHANGED', 'i');
      return;
    }
    const outcome = activeMission.kind === 'heap'
      ? evaluateHeapPacket(payloadInput.value, config)
      : evaluateByteInput(payloadInput.value, config);
    latestByteRun = { ...outcome, snapshotCapacity: config.capacity, codeSnapshot: codeEditor.value };
    $('#run-stale').hidden = true;
    memoryFrame = latestByteRun.visibleBytes.length;
    $('#verification-panel').hidden = false;
    $('#result-box').hidden = false;
    $('#memory-section').hidden = false;
    if (state.inspected && config.checked) $('#verification-panel').open = true;
    renderMemory(config, latestByteRun);
    if (activeMission.kind === 'sanitizer' && !state.activities.sanitizerEvidenceReviewed) renderSanitizerTrace(config, outcome);

    if (outcome.overflowCount > 0 && outcome.blocked && (activeMission.kind !== 'heap' || outcome.lengthBlocked)) {
      if (state.sawBug) {
        state.sawFixRun = state.bugInput === payloadInput.value;
        state.fixRunInput = payloadInput.value;
        state.fixRunCode = codeEditor.value;
        state.testedFix = false;
        setDeviceState(false, activeMission.deviceDetail);
        setResult($('#result-box'), 'success', 'BOUNDARY CHECK RAN', `The ${outcome.payloadBytes}-byte input was rejected before copying. ${config.neighbor} stayed unchanged. ${state.sawFixRun ? 'Now run the regression cases below.' : 'Re-enter the same input that exposed the bug, then run the test cases.'}`, 'SIMULATED SAFE RUN', '✓');
      } else {
        setDeviceState(false, activeMission.deviceDetail);
        setResult($('#result-box'), 'success', 'INPUT REJECTED', 'The bounds check stopped this input before copying. For the quest key, observe the vulnerable version too.', 'SIMULATED SAFE RUN', '✓');
      }
    } else if (outcome.blocked) {
      if (outcome.formatBlocked && !outcome.lengthBlocked) {
        setDeviceState(false, activeMission.deviceDetail);
        setResult($('#result-box'), 'success', 'RECORD REJECTED BY FORMAT CHECK', outcome.rejectionReason, 'NO COPY', '✓');
      } else {
        setDeviceState(false, activeMission.deviceDetail);
        setResult($('#result-box'), 'success', 'INPUT REJECTED', 'The enabled safety check stopped this input before it could change simulated memory.', 'NO COPY', '✓');
      }
    } else if (outcome.overflowCount > 0) {
      state.sawBug = true;
      state.bugInput = payloadInput.value;
      setDeviceState(latestByteRun.effect, latestByteRun.effect ? `${config.neighbor.toUpperCase()}: CHANGED` : activeMission.deviceDetail);
      let message = `${outcome.payloadBytes} bytes entered a ${config.capacity}-byte buffer. ${activeMission.effect}`;
      let eyebrow = 'BUFFER BOUNDARY CROSSED';
      if (activeMission.kind === 'sanitizer') {
        eyebrow = 'SIMULATED ACCESS TRACE';
        message = `The local teaching model places input offset +${config.capacity} beyond the ${config.capacity}-byte buffer at the copy operation. This is model output, not a sanitizer finding.`;
      } else if (activeMission.kind === 'heap') {
        eyebrow = 'PACKET CROSSED THE SLOT';
        message = `${outcome.payloadBytes} bytes exceed the ${config.capacity}-byte packet slot. Other malformed record shapes also need a separate format check.`;
      }
      setResult($('#result-box'), 'danger', eyebrow, message, 'SIMULATED BUG', '⚠');
      if (activeMission.kind === 'fuzzer') {
        $('#result-message').textContent = `The selected ${outcome.payloadBytes}-byte case crossed the simulated buffer. Inspect the changed byte before patching.`;
      }
      state.sawFixRun = false;
      state.testedFix = false;
    } else if (activeMission.kind === 'heap' && !outcome.formatValid) {
      setDeviceState(false, 'PARSER ACCEPTED AN UNKNOWN RECORD');
      setResult($('#result-box'), 'danger', 'MALFORMED RECORD ACCEPTED', 'The current parser model accepted this record because it has no enabled TEMP-format validation.', 'SIMULATED PARSER', '⚠');
    } else if (outcome.payloadBytes === 0) {
      setDeviceState(false, activeMission.deviceDetail);
      setResult($('#result-box'), 'idle', 'NO INPUT TO CHECK', 'Add an input, then run the example again.', 'WAITING FOR INPUT', '·');
    } else {
      setDeviceState(false, activeMission.deviceDetail);
      setResult($('#result-box'), 'success', 'INPUT STAYED IN BOUNDS', `${outcome.payloadBytes} bytes fit in the ${config.capacity}-byte buffer. ${config.neighbor} stayed unchanged.`, 'NO OVERFLOW', '✓');
    }
    if (!state.inspected) {
      $('#memory-inspection-message').textContent = outcome.blocked
        ? activeMission.kind === 'heap' && outcome.formatBlocked && !outcome.lengthBlocked
          ? 'The parser rejected the record shape before copying. Use the overlong valid-shape sample to inspect a boundary crossing.'
          : 'The active safety check stopped the copy before any byte changed. Run the vulnerable version to inspect an overflow.'
        : outcome.overflowCount > 0
          ? 'Select a written simulated neighbor byte to inspect where the input crossed the buffer edge.'
          : outcome.payloadBytes === 0
            ? 'No bytes were written. Add an input before inspecting the memory map.'
            : 'This input stayed within the buffer. Add one byte past the limit to produce a boundary event.';
    }
    saveCompletedMissions();
    setByteWorkflow();
    updateCompletion();
    updateRunButton(config);
  }

  function runVerificationTests() {
    const config = parseByteSettings(codeEditor.value);
    const list = $('#verification-list');
    list.replaceChildren();
    if (!config.valid) {
      verificationOutcomes = null;
      $('#verification-summary').textContent = `Tests could not run: ${config.error}`;
      $('#code-details').open = true;
      return;
    }
    const cases = activeMission.kind === 'heap' ? heapParserTestCases()
      : activeMission.kind === 'fuzzer'
        ? [...byteTestCases(config.capacity), {
          id: 'fuzz-regression',
          label: `Saved minimal failure (${progress.fuzz.activities.fuzzSelectedLength} bytes)`,
          value: 'A'.repeat(progress.fuzz.activities.fuzzSelectedLength || config.capacity + 1),
          expected: 'The retained failing input is rejected before copying.'
        }]
        : byteTestCases(config.capacity);
    $('#run-verification-tests').textContent = `Run ${cases.length} tests`;
    const outcomes = cases.map((test) => {
      if (activeMission.kind === 'heap') {
        const result = evaluateHeapPacket(test.value, config);
        const passed = test.accept
          ? result.parseAccepted && result.overflowCount === 0 && result.formatValid
          : result.blocked;
        const observed = result.parseAccepted
          ? 'Parser accepted this record.'
          : `Parser rejected it${result.rejectionReason ? `: ${result.rejectionReason}` : '.'}`;
        const item = document.createElement('li');
        item.className = `verification-case ${passed ? 'is-pass' : 'is-fail'}`;
        const name = document.createElement('span');
        name.className = 'verification-name';
        name.textContent = test.label;
        const detail = document.createElement('span');
        detail.className = 'verification-detail';
        detail.textContent = `${test.accept ? 'Expected: accept.' : 'Expected: reject.'} ${observed}`;
        const status = document.createElement('strong');
        status.className = 'verification-status';
        status.textContent = passed ? 'PASS' : 'FAIL';
        item.append(name, detail, status);
        list.append(item);
        return { id: test.id, passed };
      }

      const result = evaluateByteInput(test.value, config);
      let passed = false;
      let observed = '';
      if (test.id === 'empty') {
        passed = result.payloadBytes === 0 && result.overflowCount === 0;
        observed = 'No bytes were copied.';
      } else if (test.id === 'short' || test.id === 'boundary') {
        passed = result.overflowCount === 0 && !result.blocked;
        observed = passed ? `${result.payloadBytes} bytes fit without crossing the boundary.` : 'The configured check rejected input that should fit.';
      } else if (test.id === 'overflow' || test.id === 'fuzz-regression') {
        passed = result.overflowCount > 0 && result.blocked;
        observed = passed
          ? `${result.payloadBytes} bytes were rejected before copying.`
          : `${result.payloadBytes} bytes would pass a ${config.capacity}-byte buffer.`;
      } else {
        passed = result.overflowCount === 0 && !result.blocked;
        observed = `${result.payloadBytes} bytes fit without crossing the boundary.`;
      }
      const item = document.createElement('li');
      item.className = `verification-case ${passed ? 'is-pass' : 'is-fail'}`;
      const name = document.createElement('span');
      name.className = 'verification-name';
      name.textContent = test.label;
      const detail = document.createElement('span');
      detail.className = 'verification-detail';
      detail.textContent = `${test.expected} ${observed}`;
      const status = document.createElement('strong');
      status.className = 'verification-status';
      status.textContent = passed ? 'PASS' : 'FAIL';
      item.append(name, detail, status);
      list.append(item);
      return { id: test.id, passed };
    });
    verificationOutcomes = outcomes;
    const failed = outcomes.filter((test) => !test.passed).length;
    const allPassed = failed === 0;
    $('#verification-summary').textContent = `${cases.length - failed} of ${cases.length} simulated cases passed${failed ? `; ${failed} need attention.` : '.'}`;

    const state = progress[activeMission.id];
    const activityReady = activeMission.kind === 'stack' ? state.activities.stackPrediction
      : activeMission.kind === 'heap' ? state.activities.heapTriageComplete && config.validateTempRecord
        : activeMission.kind === 'fuzzer' ? state.activities.fuzzFindingReviewed && state.activities.fuzzExplanationRecorded
          : activeMission.kind === 'sanitizer' ? state.activities.sanitizerEvidenceReviewed
            : true;
    state.testedFix = Boolean(allPassed && activityReady && state.sawBug && state.inspected && state.sawFixRun && state.fixRunInput === state.bugInput && state.fixRunCode === codeEditor.value && config.checked);
    if (state.testedFix) {
      if (activeMission.kind === 'fuzzer' && !state.activities.regressionSaved) {
        $('#fuzz-regression-save').hidden = false;
        $('#fuzz-regression-copy').textContent = `Keep the selected ${new TextEncoder().encode(state.bugInput || '').length}-byte failure in the local regression set before claiming this quest.`;
        setResult($('#result-box'), 'success', 'BOUNDARY SUITE PASSED', 'The supported valid and invalid cases passed. Keep the minimal failing input as a regression case to complete the quest.', 'SIMULATED TESTS PASSED', '✓');
        setGuidedTask(5, 'Retain the regression case', 'The fix passes the local boundary suite. Save the smallest failing input so future edits can check it again.', 'KEEP THE CASE');
      } else {
        state.completed = true;
        setDeviceState(false, activeMission.deviceDetail);
        setResult($('#result-box'), 'success', 'PATCH VERIFIED BY TEST CASES', 'The vulnerable input was rejected and valid boundary inputs were accepted by the same local simulator.', 'SIMULATED TESTS PASSED', '✓');
        $('#memory-section').hidden = false;
        setByteWorkflow();
      }
    } else if (allPassed && !state.sawBug) {
      $('#verification-summary').textContent += ' Run the vulnerable example and inspect the crossed boundary to complete the learning path.';
      setByteWorkflow();
    } else if (allPassed && !state.sawFixRun) {
      $('#verification-summary').textContent += ' Run the same input that exposed the bug before claiming the quest key.';
      setByteWorkflow();
    } else if (allPassed && !state.inspected) {
      $('#verification-summary').textContent += ' Inspect the changed simulated byte before completing the patch.';
      setByteWorkflow();
    } else if (!allPassed) {
      state.testedFix = false;
      setByteWorkflow();
    }
    saveCompletedMissions();
    updateCompletion();
  }

  function renderFuzzCorpus() {
    const config = parseByteSettings(codeEditor.value);
    if (!config.valid) {
      $('#code-details').open = true;
      setResult($('#result-box'), 'danger', 'CHECK THE CODE SETTINGS', config.error, 'NO MEMORY CHANGED', 'i');
      return;
    }
    const activity = progress.fuzz.activities;
    $('#fuzz-explanation').value = activity.fuzzExplanation || '';
    const lengths = [...new Set([0, 1, Math.max(1, config.capacity - 1), config.capacity, config.capacity + 1, config.capacity + 4])].sort((a, b) => a - b);
    const corpus = $('#fuzz-corpus');
    corpus.replaceChildren();
    lengths.forEach((length, index) => {
      const value = 'A'.repeat(length);
      const result = evaluateByteInput(value, config);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fuzz-case';
      button.dataset.fuzzLength = String(length);
      button.setAttribute('aria-pressed', String(activity.fuzzSelectedLength === length));
      button.setAttribute('aria-label', `Case ${index + 1}: ${length} ${length === 1 ? 'byte' : 'bytes'}, ${result.overflowCount ? 'crosses the buffer' : 'within the buffer'}`);
      const caseNumber = document.createElement('span');
      caseNumber.className = 'fuzz-case-index';
      caseNumber.textContent = `#${String(index + 1).padStart(2, '0')}`;
      const sample = document.createElement('span');
      sample.className = 'fuzz-case-value';
      sample.textContent = length ? value : '∅ (empty)';
      const byteCount = document.createElement('span');
      byteCount.className = 'fuzz-case-bytes';
      byteCount.textContent = `${length} B`;
      const outcome = document.createElement('span');
      outcome.className = `fuzz-case-result ${result.overflowCount ? 'is-fail' : 'is-safe'}`;
      outcome.textContent = result.overflowCount ? `crosses +${config.capacity}` : 'within range';
      button.append(caseNumber, sample, byteCount, outcome);
      corpus.append(button);
    });
    $('#fuzz-check-finding').disabled = typeof activity.fuzzSelectedLength !== 'number';
    $('#fuzz-explanation').disabled = !activity.fuzzFindingReviewed;
    $('#fuzz-record-explanation').disabled = !activity.fuzzFindingReviewed;
    $('#fuzz-regression-save').hidden = !activity.regressionSaved;
  }

  function runFuzzer() {
    const config = parseByteSettings(codeEditor.value);
    if (!config.valid) {
      $('#code-details').open = true;
      setResult($('#result-box'), 'danger', 'CHECK THE CODE SETTINGS', config.error, 'NO MEMORY CHANGED', 'i');
      return;
    }
    // This fixed local length set demonstrates boundary exploration; it does
    // not execute student code or claim to be a production fuzzing engine.
    const activity = progress.fuzz.activities;
    activity.fuzzCorpusGenerated = true;
    activity.fuzzSelectedLength = null;
    activity.fuzzFindingReviewed = false;
    activity.fuzzExplanationRecorded = false;
    activity.fuzzExplanation = '';
    $('#fuzz-explanation').value = '';
    $('#fuzz-regression-save').hidden = true;
    renderFuzzCorpus();
    fuzzCaseFound = true;
    saveCompletedMissions();
    setResult($('#result-box'), 'idle', 'DETERMINISTIC CASE SET READY', 'Compare each generated byte length with the eight-byte buffer. Select the first case that crosses its boundary.', 'LOCAL TEACHING MODEL', '⌕');
    setByteWorkflow();
    updateRunButton(config);
  }

  function checkHeapTriage() {
    const expected = { short: 'accept', valid: 'accept', boundary: 'accept', missing: 'reject', unknown: 'reject', long: 'reject' };
    let allCorrect = true;
    Object.entries(expected).forEach(([caseId, answer]) => {
      const card = document.querySelector(`[data-heap-case="${caseId}"]`);
      const selected = card.querySelector('input:checked')?.value;
      const correct = selected === answer;
      card.classList.toggle('is-correct', correct);
      card.classList.toggle('is-incorrect', !correct);
      if (!correct) allCorrect = false;
    });
    const activity = progress.heap.activities;
    activity.heapTriageComplete = allCorrect;
    activity.heapSelections = Object.fromEntries(Object.keys(expected).map((caseId) => [
      caseId,
      document.querySelector(`[data-heap-case="${caseId}"] input:checked`)?.value || ''
    ]));
    $('#heap-triage-feedback').textContent = allCorrect
      ? 'All six classifications match the teaching model. Next, test the oversized packet and encode the size and record-shape rules in the parser.'
      : 'At least one choice is missing or inconsistent. Recheck the byte limit and whether each record contains a known field with a value, then try again.';
    saveCompletedMissions();
    setByteWorkflow();
  }

  function checkFuzzFinding() {
    const activity = progress.fuzz.activities;
    const selectedLength = activity.fuzzSelectedLength;
    if (typeof selectedLength !== 'number') return;
    const capacity = parseByteSettings(codeEditor.value).capacity;
    if (selectedLength !== capacity + 1) {
      $('#fuzz-feedback').textContent = 'That input crosses the boundary, but it is not the smallest failing candidate. Compare it with the immediately shorter generated length.';
      return;
    }
    activity.fuzzFindingReviewed = true;
    payloadInput.value = 'A'.repeat(selectedLength);
    payloadInput.dispatchEvent(new Event('input', { bubbles: true }));
    $('#fuzz-explanation').disabled = false;
    $('#fuzz-record-explanation').disabled = false;
    $('#fuzz-feedback').textContent = 'Correct selection. The case is loaded for reproduction. In your own words, relate its byte count to the buffer capacity.';
    saveCompletedMissions();
    setByteWorkflow();
    $('#fuzz-explanation').focus();
  }

  function recordFuzzExplanation() {
    const explanation = $('#fuzz-explanation').value.trim();
    if (explanation.length < 24) {
      $('#fuzz-feedback').textContent = 'Write at least one complete sentence about why the input crosses the buffer boundary.';
      return;
    }
    const activity = progress.fuzz.activities;
    activity.fuzzExplanationRecorded = true;
    activity.fuzzExplanation = explanation;
    $('#fuzz-feedback').textContent = 'Explanation recorded in this browser session. Reproduce the selected input, inspect the changed byte, patch, and verify.';
    saveCompletedMissions();
    setByteWorkflow();
    updateRunButton(parseByteSettings(codeEditor.value));
  }

  function keepFuzzRegression() {
    const state = progress.fuzz;
    if (!state.testedFix || !state.bugInput) return;
    state.activities.regressionSaved = true;
    state.activities.regressionInput = state.bugInput;
    state.completed = true;
    $('#fuzz-regression-save').hidden = true;
    setResult($('#result-box'), 'success', 'REGRESSION CASE KEPT', `${new TextEncoder().encode(state.bugInput).length}-byte failing input saved to the local workshop case set.`, 'LOCAL REGRESSION', '✓');
    saveCompletedMissions();
    setByteWorkflow();
    updateCompletion();
  }

  function checkSanitizerEvidence() {
    const config = parseByteSettings(codeEditor.value);
    const sourceLines = codeEditor.value.split(/\r?\n/);
    const accessLine = Math.max(1, sourceLines.findIndex((line) => /copy_bytes\s*\(|parse_packet\s*\(/.test(line)) + 1);
    const inputBytes = new TextEncoder().encode(payloadInput.value).length;
    const currentTraceIsUnsafe = latestByteRun
      && latestByteRun.codeSnapshot === codeEditor.value
      && latestByteRun.inputValue === payloadInput.value
      && latestByteRun.overflowCount > 0
      && !latestByteRun.blocked;
    const supportedEvidence = Boolean(currentTraceIsUnsafe && inputBytes > config.capacity);
    const correct = $('#sanitizer-line-choice').value === String(accessLine)
      && $('#sanitizer-access-choice').value === 'write'
      && $('#sanitizer-evidence-choice').value === 'length'
      && supportedEvidence;
    if (!correct) {
      $('#sanitizer-evidence-feedback').textContent = 'Those choices do not all match the modeled trace yet. Compare the copy operation, access direction, and input-to-capacity difference.';
      return;
    }
    progress.sanitizer.activities.sanitizerEvidenceReviewed = true;
    $('#sanitizer-evidence-feedback').textContent = 'Evidence linked. This is an out-of-bounds write in the local model, not a real sanitizer report. Inspect the changed byte, then patch and verify.';
    codeEditor.readOnly = false;
    $('#code-details').open = true;
    saveCompletedMissions();
    setByteWorkflow();
  }

  const challengeHints = [
    'The buffer can hold eight bytes. Compare that capacity with the input length.',
    'The important question is whether the size is checked before copy_bytes runs.',
    'Try setting CHECK_LENGTH = true, then rerun the valid, exact-boundary, and oversized cases.'
  ];

  function boundedMinutes(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? Math.max(1, Math.min(30, parsed)) : 5;
  }

  function saveChallengeTimerPreference() {
    const settings = {
      enabled: $('#challenge-timer-enabled').checked,
      minutes: boundedMinutes($('#challenge-timer-minutes').value)
    };
    $('#challenge-timer-minutes').value = String(settings.minutes);
    $('#challenge-timer-minutes').disabled = !settings.enabled;
    try { window.sessionStorage.setItem('bytesafe-challenge-timer-v1', JSON.stringify(settings)); }
    catch { /* The facilitator's timer setting remains available for this page session. */ }
    return settings;
  }

  function loadChallengeTimerPreference() {
    try {
      const settings = JSON.parse(window.sessionStorage.getItem('bytesafe-challenge-timer-v1') || '{}');
      $('#challenge-timer-enabled').checked = Boolean(settings.enabled);
      $('#challenge-timer-minutes').value = String(boundedMinutes(settings.minutes || 5));
    } catch { /* Use the disabled, five-minute defaults. */ }
    saveChallengeTimerPreference();
  }

  function stopChallengeTimer() {
    if (challengeTimerHandle !== null) window.clearInterval(challengeTimerHandle);
    challengeTimerHandle = null;
  }

  function formatClock(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
  }

  function updateChallengeClock() {
    if (!challengeSession) return;
    const elapsed = (performance.now() - challengeSession.startedAt) / 1000;
    const remaining = challengeSession.durationSeconds === null ? null : challengeSession.durationSeconds - elapsed;
    if (remaining === null) {
      $('#challenge-timer').textContent = `Elapsed ${formatClock(elapsed)}`;
      return;
    }
    if (remaining <= 0) {
      $('#challenge-timer').textContent = `Time target reached · ${formatClock(elapsed)} elapsed`;
      $('#challenge-timer').classList.add('is-ended');
      stopChallengeTimer();
      return;
    }
    $('#challenge-timer').textContent = `${formatClock(remaining)} remaining`;
  }

  function resetChallengeAttempt() {
    stopChallengeTimer();
    const timerSettings = saveChallengeTimerPreference();
    challengeSession = {
      startedAt: performance.now(),
      durationSeconds: timerSettings.enabled ? timerSettings.minutes * 60 : null,
      completed: false
    };
    challengeHintIndex = 0;
    challengeReasonCorrect = false;
    challengeTestPassed = false;
    $('#challenge-code').value = missions.find((mission) => mission.id === 'stack').code;
    $('#challenge-code').disabled = false;
    $('#challenge-input').value = 'AAAAAAAAA';
    $('#challenge-input').disabled = false;
    $('#challenge-run').disabled = false;
    $('#challenge-hint-count').textContent = '0 of 3';
    $('#challenge-hint-copy').textContent = 'Hints reveal one at a time.';
    $('#challenge-next-hint').textContent = 'Reveal first hint';
    $('#challenge-next-hint').disabled = false;
    $('#challenge-test-summary').textContent = 'Tests have not run.';
    $('#challenge-test-list').replaceChildren();
    $('#challenge-reason-feedback').textContent = 'Choose the explanation that matches the simulator.';
    $('#challenge-reasons').querySelectorAll('button').forEach((button) => {
      button.disabled = false;
      button.classList.remove('is-correct', 'is-wrong');
    });
    $('#challenge-completion').hidden = true;
    $('#challenge-timer').classList.remove('is-ended');
    updateChallengeClock();
    challengeTimerHandle = window.setInterval(updateChallengeClock, 1000);
    renderChallengeHistory();
  }

  function renderChallengeHistory() {
    const list = $('#challenge-history-list');
    list.replaceChildren();
    let results = [];
    try {
      const saved = JSON.parse(window.localStorage.getItem('bytesafe-challenge-results-v1') || '[]');
      results = Array.isArray(saved) ? saved.filter((result) => result && result.completed === true).slice(0, 5) : [];
    } catch { /* Local history is optional when browser storage is unavailable. */ }
    if (!results.length) {
      const empty = document.createElement('li');
      empty.textContent = 'No local completions yet.';
      list.append(empty);
      return;
    }
    results.forEach((result) => {
      const item = document.createElement('li');
      item.textContent = `${formatClock(result.elapsedSeconds)} · ${result.hintsUsed} hint${result.hintsUsed === 1 ? '' : 's'} · tests and reasoning verified`;
      list.append(item);
    });
  }

  function saveChallengeCompletion() {
    const elapsedSeconds = Math.round((performance.now() - challengeSession.startedAt) / 1000);
    const result = {
      completed: true,
      elapsedSeconds,
      hintsUsed: challengeHintIndex,
      completedAt: new Date().toISOString()
    };
    try {
      const saved = JSON.parse(window.localStorage.getItem('bytesafe-challenge-results-v1') || '[]');
      const history = Array.isArray(saved) ? saved.filter((entry) => entry && entry.completed === true) : [];
      window.localStorage.setItem('bytesafe-challenge-results-v1', JSON.stringify([result, ...history].slice(0, 5)));
    } catch { /* The challenge can still finish without local history storage. */ }
    renderChallengeHistory();
    return result;
  }

  function checkChallengeCompletion() {
    if (!challengeSession || challengeSession.completed || !challengeTestPassed || !challengeReasonCorrect) return;
    challengeSession.completed = true;
    const result = saveChallengeCompletion();
    $('#challenge-completion-title').textContent = 'Challenge complete';
    $('#challenge-completion-copy').textContent = `The valid boundary cases stayed safe, the oversized input was rejected, and your explanation was correct. Time: ${formatClock(result.elapsedSeconds)}. Speed did not affect the result.`;
    $('#challenge-completion').hidden = false;
    $('#challenge-code').disabled = true;
    $('#challenge-input').disabled = true;
    $('#challenge-run').disabled = true;
    $('#challenge-reasons').querySelectorAll('button').forEach((button) => { button.disabled = true; });
    stopChallengeTimer();
    updateChallengeClock();
  }

  function runChallengeTests() {
    if (!challengeSession || challengeSession.completed) return;
    const stackMission = missions.find((mission) => mission.id === 'stack');
    const config = parseByteSettings($('#challenge-code').value, stackMission);
    const input = $('#challenge-input').value;
    const list = $('#challenge-test-list');
    list.replaceChildren();
    if (!config.valid) {
      challengeTestPassed = false;
      $('#challenge-test-summary').textContent = `Tests could not run: ${config.error}`;
      return;
    }
    const challengeOutcome = evaluateByteInput(input, config);
    const cases = [
      { label: 'Valid input', outcome: evaluateByteInput('A'.repeat(config.capacity - 1), config), pass: (result) => result.overflowCount === 0 && !result.blocked, explanation: 'A shorter input should fit.' },
      { label: 'Exact boundary', outcome: evaluateByteInput('A'.repeat(config.capacity), config), pass: (result) => result.overflowCount === 0 && !result.blocked, explanation: 'An input exactly at capacity should fit.' },
      { label: 'Challenge input', outcome: challengeOutcome, pass: (result) => result.overflowCount > 0 && result.blocked, explanation: 'The chosen input must exceed capacity and be rejected before copying.' }
    ];
    cases.forEach((test) => {
      const passed = test.pass(test.outcome);
      const item = document.createElement('li');
      item.className = `verification-case ${passed ? 'is-pass' : 'is-fail'}`;
      const name = document.createElement('span');
      name.className = 'verification-name';
      name.textContent = test.label;
      const detail = document.createElement('span');
      detail.className = 'verification-detail';
      detail.textContent = `${test.explanation} ${passed ? 'Observed behavior matches.' : test.outcome.overflowCount > 0 && !test.outcome.blocked ? 'The simulated write crosses the boundary.' : 'The required condition was not met.'}`;
      const status = document.createElement('strong');
      status.className = 'verification-status';
      status.textContent = passed ? 'PASS' : 'FAIL';
      item.append(name, detail, status);
      list.append(item);
    });
    challengeTestPassed = cases.every((test) => test.pass(test.outcome));
    $('#challenge-test-summary').textContent = challengeTestPassed
      ? 'All 3 supported challenge tests passed in the local simulator.'
      : `${cases.filter((test) => test.pass(test.outcome)).length} of 3 challenge tests passed. Check the failed case and try again.`;
    checkChallengeCompletion();
  }

  function startChallenge() {
    resetChallengeAttempt();
    if (!$('#challenge-dialog').open) $('#challenge-dialog').showModal();
    $('#challenge-code').focus();
  }

  function revealChallengeHint() {
    if (challengeHintIndex >= challengeHints.length) return;
    $('#challenge-hint-copy').textContent = challengeHints[challengeHintIndex];
    challengeHintIndex += 1;
    $('#challenge-hint-count').textContent = `${challengeHintIndex} of ${challengeHints.length}`;
    $('#challenge-next-hint').textContent = challengeHintIndex === challengeHints.length ? 'All hints revealed' : 'Reveal next hint';
    $('#challenge-next-hint').disabled = challengeHintIndex === challengeHints.length;
  }

  function setPresentationMode(enabled) {
    presentationMode = Boolean(enabled);
    document.body.classList.toggle('presentation-mode', presentationMode);
    $('#host-presenter-toggle').setAttribute('aria-pressed', String(presentationMode));
    $('#host-presenter-toggle').querySelector('b').textContent = presentationMode ? 'Exit presentation view' : 'Presentation view';
    $('#presentation-exit-wrap').hidden = !presentationMode;
    if (presentationMode) {
      $('#facilitator-panel').hidden = true;
      $('#facilitator-toggle').setAttribute('aria-expanded', 'false');
      $('#presentation-exit').focus();
    } else {
      $('#facilitator-toggle').focus();
    }
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
    markVerificationResultsStale();
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
    while (timelineStep < 4) advanceUafTimeline(true);
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
    $('#uaf-previous').disabled = true;
    $('#uaf-next').querySelector('span').textContent = 'Start timeline';
    $('#uaf-mark-inspected').hidden = true;
    $('#uaf-instruction').textContent = 'Step through each event to see what the saved pointer refers to.';
    setDeviceState(false, activeMission.deviceDetail, false);
    setUafWorkflow();
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
    objectAddress.textContent = timelineStep >= 1 ? 'simulated slot A' : 'slot not allocated';
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
      pointerValue.textContent = pointerCleared ? 'NULL' : timelineStep >= 1 ? 'status → slot A' : 'status → —';
    const pointerAddress = document.createElement('span');
    pointerAddress.className = 'pointer-address';
    pointerAddress.textContent = pointerStale ? 'dangling reference' : pointerCleared ? 'cleared on release' : 'owner: demo service';
    pointer.append(pointerLabel, pointerValue, pointerAddress);
    visual.append(object, arrow, pointer);
  }

  function advanceUafTimeline(isFacilitatorDemo = false) {
    if (!isFacilitatorDemo && !progress.uaf.understood) {
      $('#uaf-instruction').textContent = 'Confirm the goal before stepping through the timeline.';
      return;
    }
    if (!isFacilitatorDemo && !progress.uaf.activities.uafPredictionReviewed) {
      $('#uaf-instruction').textContent = 'Record your prediction about the released pointer before starting the timeline.';
      return;
    }
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
      $('#uaf-instruction').textContent = 'The demo service allocated a status object in simulated slot A.';
      setResult($('#uaf-result'), 'idle', 'OBJECT ALLOCATED', 'In this teaching model, the pointer refers to a live object that reports SAFE.', 'STEP 1 OF 4', '1');
    } else if (timelineStep === 2) {
      const description = settings.clearsPointer ? 'The object was released and the saved pointer was cleared.' : 'The object was released, but the saved pointer still holds its old address.';
      $('#uaf-instruction').textContent = description;
      setResult($('#uaf-result'), settings.clearsPointer ? 'success' : 'danger', settings.clearsPointer ? 'POINTER CLEARED' : 'DANGLING POINTER', settings.clearsPointer ? description : 'The pointer still names simulated slot A, even though the object lifetime has ended.', 'STEP 2 OF 4', settings.clearsPointer ? '✓' : '2');
    } else if (timelineStep === 3) {
      $('#uaf-instruction').textContent = 'For this example, the simulated allocator reuses slot A for a different demo value.';
      setResult($('#uaf-result'), settings.clearsPointer ? 'success' : 'danger', settings.clearsPointer ? 'ADDRESS REUSED SAFELY' : 'ADDRESS REUSED', settings.clearsPointer ? 'The old pointer was cleared, so it cannot reach the new object.' : 'The same address now contains a different object: LOCK_STATE = OPEN.', 'STEP 3 OF 4', '3');
    } else if (settings.clearsPointer) {
      $('#uaf-instruction').textContent = 'The read was blocked because the pointer is NULL.';
      setResult($('#uaf-result'), 'success', 'STALE READ BLOCKED', 'The simulator refused the read after release. The old object cannot be accessed.', 'STEP 4 OF 4', '✓');
      setDeviceState(false, 'SAFE: STALE READ BLOCKED');
      if (progress.uaf.sawBug && progress.uaf.inspected && progress.uaf.activities.ownershipReviewed) {
        progress.uaf.testedFix = true;
        progress.uaf.completed = true;
        setGuidedTask(5, 'Pointer cleanup verified', 'The cleared pointer blocked the stale read on replay. The next quest is unlocked.', 'QUEST COMPLETE', true);
      } else {
        setResult($('#uaf-result'), 'success', 'SAFE REPLAY', 'The stale read is blocked in this run. To earn the quest key, first observe and inspect the vulnerable replay.', 'SIMULATED SAFE RUN', '✓');
      }
    } else {
      progress.uaf.sawBug = true;
      $('#uaf-instruction').textContent = 'The old pointer read the new demo value in reused simulated slot A.';
      setResult($('#uaf-result'), 'danger', 'USE-AFTER-FREE SIMULATED', 'The stale pointer read LOCK_STATE = OPEN from the reused slot. No real object or device was touched.', 'STEP 4 OF 4', '⚠');
      setDeviceState(true, 'LOCK STATE: OPEN');
    }
    $('#uaf-next').querySelector('span').textContent = timelineStep === 4 ? 'Timeline complete' : 'Next step';
    $('#uaf-next').disabled = timelineStep === 4;
    $('#uaf-previous').disabled = timelineStep === 0;
    $('#uaf-mark-inspected').hidden = !(timelineStep === 4 && !settings.clearsPointer) || progress.uaf.inspected;
    setUafWorkflow();
    saveCompletedMissions();
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
    if (missions.every(missionComplete)) {
      const campaignMap = $('.campaign-map');
      const mapSummary = campaignMap.querySelector('summary');
      campaignMap.open = true;
      mapSummary.scrollIntoView({ behavior: motionEnabled ? 'smooth' : 'auto', block: 'center' });
      mapSummary.focus({ preventScroll: true });
      return;
    }

    const index = missions.findIndex((mission) => mission.id === activeMission.id);
    if (!missionComplete(activeMission)) return;
    if (index < missions.length - 1) setMission(missions[index + 1].id);
  }

  missionList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-mission]');
    if (!button || button.disabled) return;
    setMission(button.dataset.mission);
    // Keep the navigator visible beside the workspace on larger screens.
    // Collapse it on narrow screens after a selection to return focus to the task.
    if (window.matchMedia('(max-width: 760px)').matches) $('.campaign-map').open = false;
  });
  $('#acknowledge-goal').addEventListener('click', () => {
    progress[activeMission.id].understood = true;
    $('#acknowledge-goal').hidden = true;
    saveCompletedMissions();
    if (activeMission.kind === 'uaf') setUafWorkflow();
    else if (isByteMission()) setByteWorkflow();
    else setLearningActivityWorkflow();
  });
  $('#address-grid').addEventListener('click', (event) => {
    const cell = event.target.closest('[data-map-index]');
    if (!cell) return;
    $('#address-grid').querySelectorAll('[data-map-index]').forEach((item) => {
      item.setAttribute('aria-pressed', String(item === cell));
    });
    progress.map.activities.mapSelectedIndex = Number(cell.dataset.mapIndex);
    saveCompletedMissions();
  });
  $('#check-memory-map').addEventListener('click', checkMemoryMap);
  $('#check-stack-prediction').addEventListener('click', checkStackPrediction);
  $('#check-pointer-prediction').addEventListener('click', checkPointerPrediction);
  $('#pointer-array').addEventListener('click', selectPointerTarget);
  $('#pointer-confirm-target').addEventListener('click', confirmPointerTarget);
  $('#pointer-advance').addEventListener('click', advancePointer);
  $('#check-pointer-dereference').addEventListener('click', checkOnePastDereference);
  $('#check-uaf-prediction').addEventListener('click', checkUafPrediction);
  $('#check-ownership-choice').addEventListener('click', checkOwnershipChoice);
  $('#review-test-choices').addEventListener('click', (event) => {
    const button = event.target.closest('[data-review-test]');
    if (!button) return;
    progress.review.activities.reviewSelectedTest = button.dataset.reviewTest;
    $('#review-test-choices').querySelectorAll('[data-review-test]').forEach((item) => {
      item.classList.toggle('is-selected', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
    $('#run-review-test').disabled = false;
    saveCompletedMissions();
  });
  $('#run-review-test').addEventListener('click', runReviewTest);
  $('#check-review-fix').addEventListener('click', checkReviewFix);
  $('#quiz-options').addEventListener('click', answerQuiz);
  $('#quiz-next').addEventListener('click', advanceQuiz);
  codeEditor.addEventListener('input', () => {
    markVerificationResultsStale();
    markSimulationStale();
    updateModePreview();
  });
  codeEditorUaf.addEventListener('input', () => {
    const nextSettings = parseUafSettings();
    updateModePreview();
    if (nextSettings.valid && timelineMode !== null && timelineMode !== nextSettings.clearsPointer) resetUafTimeline();
  });
  payloadInput.addEventListener('input', () => {
    const count = new TextEncoder().encode(payloadInput.value).length;
    $('#byte-count').textContent = `${count} ${count === 1 ? 'BYTE' : 'BYTES'}`;
    markVerificationResultsStale();
    markSimulationStale();
  });
  $('#memory-map').addEventListener('click', (event) => {
    const cell = event.target.closest('.memory-cell');
    if (!cell || cell.disabled || !latestByteRun || !$('#run-stale').hidden) return;
    if (!progress[activeMission.id].understood) {
      $('#memory-inspection-message').textContent = 'Confirm that you understand the quest goal before marking the result inspected.';
      return;
    }
    $('#memory-map').querySelectorAll('.memory-cell[aria-pressed="true"]').forEach((item) => {
      item.setAttribute('aria-pressed', 'false');
      item.classList.remove('is-selected');
    });
    cell.setAttribute('aria-pressed', 'true');
    cell.classList.add('is-selected');
    const offset = Number(cell.dataset.position);
    const byte = cell.querySelector('.memory-cell-byte').textContent;
    progress[activeMission.id].inspected = true;
    $('#memory-inspection-message').textContent = `You selected simulated byte +${offset.toString(16).toUpperCase().padStart(2, '0')} (0x${byte}). In this model it was written beyond the ${latestByteRun.capacity}-byte buffer; real layouts vary.`;
    saveCompletedMissions();
    setByteWorkflow();
    $('#code-details').open = true;
  });
  $('#memory-previous').addEventListener('click', () => setMemoryFrame(memoryFrame - 1));
  $('#memory-next').addEventListener('click', () => setMemoryFrame(memoryFrame + 1));
  $('#memory-replay').addEventListener('click', replayMemory);
  $('#memory-reset-view').addEventListener('click', () => setMemoryFrame(0));
  $('#run-verification-tests').addEventListener('click', runVerificationTests);
  $('#run-button').addEventListener('click', () => {
    if (activeMission.kind === 'fuzzer' && !progress.fuzz.activities.fuzzCorpusGenerated) runFuzzer();
    else if (activeMission.kind === 'fuzzer') runByteSimulation();
    else runByteSimulation();
  });
  $('#heap-check-triage').addEventListener('click', checkHeapTriage);
  $('#heap-triage-activity').addEventListener('click', (event) => {
    const loadButton = event.target.closest('[data-heap-load]');
    if (!loadButton) return;
    payloadInput.value = loadButton.dataset.heapLoad;
    payloadInput.dispatchEvent(new Event('input', { bubbles: true }));
    payloadInput.focus();
  });
  $('#fuzz-corpus').addEventListener('click', (event) => {
    const selected = event.target.closest('[data-fuzz-length]');
    if (!selected) return;
    progress.fuzz.activities.fuzzSelectedLength = Number(selected.dataset.fuzzLength);
    renderFuzzCorpus();
    saveCompletedMissions();
  });
  $('#fuzz-check-finding').addEventListener('click', checkFuzzFinding);
  $('#fuzz-explanation').addEventListener('input', () => {
    $('#fuzz-record-explanation').disabled = !progress.fuzz.activities.fuzzFindingReviewed || $('#fuzz-explanation').value.trim().length < 24;
  });
  $('#fuzz-record-explanation').addEventListener('click', recordFuzzExplanation);
  $('#fuzz-keep-regression').addEventListener('click', keepFuzzRegression);
  $('#sanitizer-check-evidence').addEventListener('click', checkSanitizerEvidence);
  payloadInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      if (activeMission.kind === 'fuzzer' && !progress.fuzz.activities.fuzzCorpusGenerated) runFuzzer();
      else runByteSimulation();
    }
  });
  $('#clear-button').addEventListener('click', resetByteLab);
  $('#fill-edge').addEventListener('click', () => fillPayloadToLimit(false));
  $('#fill-overflow').addEventListener('click', () => fillPayloadToLimit(true));
  $('#uaf-next').addEventListener('click', advanceUafTimeline);
  $('#uaf-previous').addEventListener('click', () => {
    if (timelineStep <= 0) return;
    timelineStep -= 1;
    renderUafTimeline();
    $('#uaf-next').disabled = false;
    $('#uaf-next').querySelector('span').textContent = timelineStep === 0 ? 'Start timeline' : 'Next step';
    $('#uaf-previous').disabled = timelineStep === 0;
    $('#uaf-mark-inspected').hidden = true;
    $('#uaf-instruction').textContent = timelineStep === 0 ? 'Timeline reset to the beginning.' : `Reviewing event ${timelineStep} of 4. Continue when ready.`;
    setResult($('#uaf-result'), 'idle', timelineStep ? 'TIMELINE STEP REVIEWED' : 'TIMELINE RESET', timelineStep ? 'You can inspect this state again, then continue through the remaining events.' : 'Start the timeline to follow the simulated pointer story.', timelineStep ? `STEP ${timelineStep} OF 4` : 'READY', '↶');
    setUafWorkflow();
  });
  $('#uaf-reset').addEventListener('click', resetUafTimeline);
  $('#uaf-mark-inspected').addEventListener('click', () => {
    if (timelineStep !== 4 || timelineMode !== false) return;
    if (!progress.uaf.understood) {
      $('#uaf-instruction').textContent = 'Confirm that you understand the quest goal before marking the pointer read inspected.';
      return;
    }
    progress.uaf.inspected = true;
    $('#uaf-mark-inspected').hidden = true;
    $('#ownership-review').hidden = false;
    saveCompletedMissions();
    setUafWorkflow();
    $('#uaf-code-details').open = true;
  });
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
  const learningNotes = $('#learning-notes');
  const hostNotesToggle = $('#host-toggle-notes');
  function syncHostNotesButton() {
    hostNotesToggle.setAttribute('aria-pressed', String(learningNotes.open));
    hostNotesToggle.querySelector('b').textContent = learningNotes.open ? 'Conceal field notes' : 'Show field notes';
  }
  hostNotesToggle.addEventListener('click', () => {
    learningNotes.open = !learningNotes.open;
    syncHostNotesButton();
  });
  learningNotes.addEventListener('toggle', syncHostNotesButton);
  $('#host-presenter-toggle').addEventListener('click', () => setPresentationMode(!presentationMode));
  $('#presentation-exit').addEventListener('click', () => setPresentationMode(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && presentationMode && !$('#challenge-dialog').open) setPresentationMode(false);
  });
  $('#challenge-timer-enabled').addEventListener('change', saveChallengeTimerPreference);
  $('#challenge-timer-minutes').addEventListener('change', saveChallengeTimerPreference);
  loadChallengeTimerPreference();
  $('#challenge-launch').addEventListener('click', startChallenge);
  $('#challenge-close').addEventListener('click', () => $('#challenge-dialog').close());
  $('#challenge-done').addEventListener('click', () => $('#challenge-dialog').close());
  $('#challenge-dialog').addEventListener('close', stopChallengeTimer);
  $('#challenge-restart').addEventListener('click', resetChallengeAttempt);
  $('#challenge-run').addEventListener('click', runChallengeTests);
  $('#challenge-next-hint').addEventListener('click', revealChallengeHint);
  $('#challenge-code').addEventListener('input', () => {
    challengeTestPassed = false;
    $('#challenge-test-summary').textContent = 'Code changed. Rerun the challenge tests.';
    $('#challenge-test-list').replaceChildren();
  });
  $('#challenge-input').addEventListener('input', () => {
    challengeTestPassed = false;
    $('#challenge-test-summary').textContent = 'Input changed. Rerun the challenge tests.';
    $('#challenge-test-list').replaceChildren();
  });
  $('#challenge-reasons').addEventListener('click', (event) => {
    const answer = event.target.closest('[data-challenge-reason]');
    if (!answer || challengeSession?.completed) return;
    challengeReasonCorrect = answer.dataset.challengeReason === 'correct';
    $('#challenge-reasons').querySelectorAll('button').forEach((button) => button.classList.remove('is-correct', 'is-wrong'));
    answer.classList.add(challengeReasonCorrect ? 'is-correct' : 'is-wrong');
    $('#challenge-reason-feedback').textContent = challengeReasonCorrect
      ? 'Correct. The check prevents an oversized write from reaching the modeled neighbor.'
      : 'That reason is not supported by this model. Review the boundary and try another choice.';
    checkChallengeCompletion();
  });

  const themeToggle = $('#theme-toggle');
  const themeLabel = $('#theme-label');
  function savedThemePreference() {
    try { return window.localStorage.getItem('bytesafe-theme'); }
    catch { return null; }
  }
  function applyTheme(theme) {
    const dark = theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    themeLabel.textContent = dark ? 'Light mode' : 'Dark mode';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#171d1d' : '#f4f2ed';
  }
  themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { window.localStorage.setItem('bytesafe-theme', nextTheme); } catch { /* Theme stays in memory if storage is unavailable. */ }
    applyTheme(nextTheme);
  });
  window.addEventListener('storage', (event) => {
    if (event.key === 'bytesafe-theme') applyTheme(event.newValue === 'light' ? 'light' : 'dark');
  });
  applyTheme(savedThemePreference() === 'light' ? 'light' : 'dark');

  const motionToggle = $('#motion-toggle');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
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

  const cursorBurst = document.createElement('span');
  cursorBurst.className = 'cursor-click-burst';
  cursorBurst.setAttribute('aria-hidden', 'true');
  document.body.append(cursorBurst);
  cursorBurst.addEventListener('animationend', () => cursorBurst.classList.remove('is-active'));
  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.isPrimary === false) return;
    if (!motionEnabled || reducedMotionQuery.matches) {
      cursorBurst.classList.remove('is-active');
      return;
    }

    // The burst artwork is 24px square, with its rays arranged around the cursor's (11, 11) tip anchor.
    cursorBurst.style.left = `${event.clientX - 11}px`;
    cursorBurst.style.top = `${event.clientY - 11}px`;
    cursorBurst.classList.remove('is-active');
    void cursorBurst.offsetWidth;
    cursorBurst.classList.add('is-active');
  }, { passive: true });
  motionToggle.addEventListener('click', () => {
    if (!motionEnabled || reducedMotionQuery.matches) cursorBurst.classList.remove('is-active');
  });
  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', (event) => {
      if (event.matches) cursorBurst.classList.remove('is-active');
    });
  }

  if (window.matchMedia('(max-width: 760px)').matches) $('.campaign-map').open = false;
  updateMissionCopy();
  setMission(missions.find((mission) => !missionComplete(mission))?.id || missions[missions.length - 1].id);
})();
