/***********************  BASIC CONSTS & HELPER FUNCS  ************************/

const off_color = "#121212";
const on_color  = "#FFC400";

var memories = []; // Network's list of stored memories
var W = [];        // Network's weight matrix

// Converts a -1 or +1 value to associated color
function val_to_color(value) {
  if (value == 1) return on_color;
  else return off_color;
}

function val_to_char(val) {
  if (val == 1) return ' * ';
  else return ' o ';
}

// Kill the network when it's oscillating endlessly
function kill_oscs() {
  hide_kill_msg();
  anime.remove('.neuron');
  clear_grid();
}

// Convert string of comma-separated integers to an array
function strToNumArray(str){
  return str.split(',').map(val => parseInt(val, 10));
}

/****************************  SIMPLE ANIMATIONS  *****************************/

// Specified neuron changes color
function change_color_anim(object, color) {
  anime({
    targets: object,
    backgroundColor: [
      {value: color, easing: 'easeOutCirc', duration: 200}
    ],
    scale: [
      {value: .8, easing: 'easeOutSine', duration: 100},
      {value: 1, easing: 'easeInOutQuad', duration: 100}
    ]
  });
}

function clear_grid_anim() {
  anime({
    targets: '#grid .neuron',
    scale: [
      {value: .1, easing: 'easeOutSine', duration: 500},
      {value: 1, easing: 'easeInOutQuad', duration: 1200}
    ],
    backgroundColor: [
      {value: off_color, easing: 'easeOutSine', duration: 500}
    ],
    delay: anime.stagger(200, {grid: [4, 3], from: 'center'}),
    begin: function() {
      $('#dont_touch').css('display', 'inherit');
    },
    complete: function() {
      $('#dont_touch').css('display', 'none');
    }
  });
}

// Display message offering to kill oscillations
function show_kill_msg() {
  $('#kill_msg').css('display', 'flex');
  anime({
    targets: '#kill_msg',
    opacity: [
      {value: '0%', easing: 'easeOutSine', duration: 0},
      {value: '100%', easing: 'easeOutSine', duration: 600},
    ]
  });
}

// Hide message offering to kill oscillations
function hide_kill_msg() {
  anime({
    targets: '#kill_msg',
    opacity: [
      {value: '100%', easing: 'easeOutSine', duration: 0},
      {value: '0%', easing: 'easeOutSine', duration: 600},
    ],
    complete: function() {
      $('#kill_msg').css('display', 'none');
    }
  });
}

// Neurons flash to indicate the network has converged
function flash_done() {
  anime({
    targets: '.neuron',
    borderRadius: [
      {value: '50%', easing: 'easeOutSine', duration: 0},
      {value: '35%', easing: 'easeOutSine', duration: 300},
      {value: '50%', easing: 'easeOutSine', duration: 300},
    ],
    delay: 600,
    complete: function() {
      $('#dont_touch').css('display', 'none');
    }
  });
}

// Take a newly learned memory and display it in text form
function disp_mem(memory) {
  num_rows = $("#grid_rows").val();
  num_cols = $("#grid_cols").val();

  str = "<p>";

  for (let i = 0; i < num_rows; i++) {
    curr_row_pos = "";
    curr_row_neg = "";
    for (let j = 0; j < num_cols; j++) {
      curr_row_pos += val_to_char(memory[i * num_cols + j]);
      curr_row_neg += val_to_char(-1 * memory[i * num_cols + j]);
    }
    str += curr_row_pos + "&nbsp;&nbsp;&nbsp;" + curr_row_neg + "<br>"
  }
  str += "</p>"

  $("#mems_list").append(str);
}

/******************************  NETWORK ACTIONS ******************************/

// Flip state & color of given neuron
function flip_neuron(neuron) {
  const new_state = $(neuron).attr("data-state") * -1;
  const new_color = val_to_color(new_state);

  $(neuron).attr("data-state", new_state);
  change_color_anim(neuron, new_color);
}

// Reset the entire grid of neurons to "off" state
function clear_grid() {
  $.each($(".neuron"), function(){
    $(this).attr("data-state", -1);
  });
  clear_grid_anim();
}

// Convert user-side view of network to array of neuron values
function pull_net_state() {
  return $.map($(".neuron"), function(neuron){
    return parseInt(neuron.dataset["state"], 10);
  });
}

// Change user-side user-side view of network to match gven array of neuron values
function push_net_state(network) {
  $.map($(".neuron"), function(neuron, i){
    if (neuron.dataset["state"] != network[i]) {
      flip_neuron(neuron);
    }
  });
}

// Network stores a given sequence of neuron values as a memory & updates weights
function store_memory(memory, mem_list) {
  // Convert js arrays to strings to be able to compare
  const mem_strings = $.map(mem_list, function(item) {
    return item.toString();
  });

  // look at the negative version as well
  negative = $.map(memory, val => -1 * val);

  // Save the memory unless it's already stored
  if (!mem_strings.includes(memory.toString())) {
    if (!mem_strings.includes(negative.toString())){
      mem_list.push(memory);
      update_num_mems(mem_list.length);
      disp_mem(memory);
    }
  }

  clear_grid();

  return learn_weights(memories);
}

// Set network weights based on stored memories
function learn_weights(mems) {
  // number of neurons
  let N = mems[0].length;
  let eta = 1 / N;

  // Initialize weight matrix full of zeroes
  let W = [...Array(N)].map(_ => Array(N).fill(0));

  let num_mems = mems.length;

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < i; j++) {
      temp_sum = 0;
      for (let k = 0; k < num_mems; k++) {
        // Sum all correlations between neurons i and j in the memories
        temp_sum += mems[k][i] * mems[k][j];
      }
      let w = eta * temp_sum; // Scale all entries so numbers don't get too big
      W[i][j] = w;
      W[j][i] = w; // Weight matrix is symmetric
    }
  }
  return W;
}

function wipe_memory() {
  W = [];
  memories = [];
  update_num_mems(0);
  $("#mems_list").html("");
}

// Return neuron state based on if activation is above threshold or below
function threshold(a) {
  if (a >= 0) {
    return 1;
  } else {
    return -1;
  }
}

// Given neuron examines network and decides whether to change status
function update_neuron(i, weights, network) {
  // Examine network & compute activation
  let activation = 0;
  for (let j = 0; j < weights.length; j++) {
    activation += weights[i][j] * network[j];
  }
  // Compare activation to threshold
  return threshold(activation);
}

// Decide new values for all neurons at the next time step synchronously
function update_network_sync(network) {
  return $.map(network, function(neuron, i) {
    return update_neuron(i, W, network)
  });
}

// Run entire network with synchronous updates
function run_network_sync() {
  let curr_state  = pull_net_state();
  let past_states = [curr_state.toString()];
  let converged   = false;
  let oscillating = false;
  let osc_index   = -1;

  // Run the network until we reach a steady state
  while (!converged && !oscillating) {
    // Update the network and see if we've already held this state before
    let new_state  = update_network_sync(curr_state);
    let past_index = past_states.indexOf(new_state.toString());

    if (past_index == -1) { // New state is novel
      past_states.push(new_state.toString());
    }
    else if (past_index == past_states.length - 1) { // No change in current state
      converged = true;
    }
    else { // Network is looping between states
      oscillating = true;
      osc_index   = past_index;
    }
    // Reassign current state
    curr_state = new_state;
  }

  // Convert strings back to arrays (no longer need to compare)
  past_states = past_states.map(str => strToNumArray(str));

  // Animate one loop through of unique states of network
  var tl_unique = anime.timeline({
    autoplay: false,
    duration: 200,
    begin: function() {
      $('#dont_touch').css('display', 'inherit');
    }
  });
  create_sync_timeline(tl_unique, past_states, osc_index, false);
  tl_unique.play();

  // Animate oscillations if they exist
  tl_unique.finished.then(function() {
    if (!oscillating) {
      flash_done();
    }
    else {
      var tl_osc = anime.timeline({
        autoplay: false,
        duration: 200,
        loop: true,
        begin: function() {
          $('#dont_touch').css('display', 'inherit');
          show_kill_msg();
        }
      });
      create_sync_timeline(tl_osc, past_states, osc_index, true);
      tl_osc.play();
    }
  });
}

// Run entire network with asynchronous updates
function run_network_async() {
  let init_state = pull_net_state();
  let converged = false;
  let timeline = anime.timeline({
    autoplay: false,
    duration: 600,
    begin: function() {
      $('#dont_touch').css('display', 'inherit');
    },
    complete: flash_done
  });

  while (!converged) {
    new_state = Array.from(init_state);

    // loop thru each neuron in order & update asynchronously
    for (let i = 0; i < new_state.length; i++) {
      new_state[i] = update_neuron(i, W, new_state);
    }

    create_async_timeline(timeline, new_state);

    if (new_state.toString() == init_state.toString()) {
      // Looped thru each neuron & nobody changed
      converged = true;
    }

    init_state = new_state;
  }

  timeline.play();
}

/************************  ANIMATION TIMELINE HELPERS ************************/

// Given two states, return lists of neurons which turn off & which turn on
function list_of_changes(prev_state, curr_state) {
  let turn_on  = [];
  let turn_off = [];

  // Note which neurons change sign in current timestep
  for (let j = 0; j < curr_state.length; j++) {
    let change = Math.sign(curr_state[j] - prev_state[j]);
    if (change == 1) {
      turn_on.push(j);
    }
    else if (change == -1) {
      turn_off.push(j)
    }
  }

  // Convert to the associated DOM objects
  turn_on  =  turn_on.map(i => $("#neuron" + i)[0]);
  turn_off = turn_off.map(i => $("#neuron" + i)[0]);

  return [turn_on, turn_off];
}

// Create an animated timeline of chained synchronous timesteps
function create_sync_timeline(timeline, states, osc_index, looping) {
  if (looping) {
    var cut_loc = osc_index + 1;
    // Go from ending state back to the start of loop in first step
    loop_last  = states[states.length - 1];
    loop_first = states[osc_index];
    let [on_targets, off_targets] = list_of_changes(loop_last, loop_first);
    add_sync_step(timeline, "+=500", on_targets, off_targets, loop_first);
  }
  else {
    var cut_loc = 1;
  }

  // Animate each change from one state to the next
  states.slice(cut_loc).forEach(function(curr_state, k) {
    prev_state = states[cut_loc - 1 + k];
    curr_state = curr_state;

    if (k == 0 && !looping) {
      // Don't add a time delay on first step of the animation
      time_pause = "0";
    }
    else {
      time_pause = "+=500";
    }

    let [on_targets, off_targets] = list_of_changes(prev_state, curr_state);
    add_sync_step(timeline, time_pause, on_targets, off_targets, curr_state);
  });
}

// Animate a single-timestep synchronous state change of the network
function add_sync_step(timeline, pause, on_targets, off_targets, state) {
  timeline.add({
    targets: on_targets,
    backgroundColor: [
      {value: on_color, easing: 'easeOutCirc', duration: 200}
    ],
    scale: [
      {value: .8, easing: 'easeOutSine', duration: 100},
      {value: 1, easing: 'easeInOutQuad', duration: 100}
    ],
  }, pause); // brief pause between time steps
  timeline.add({
    targets: off_targets,
    backgroundColor: [
      {value: off_color, easing: 'easeOutCirc', duration: 200}
    ],
    scale: [
      {value: .8, easing: 'easeOutSine', duration: 100},
      {value: 1, easing: 'easeInOutQuad', duration: 100}
    ],
    complete: function() {
      // push the numerical values to the neurons
      $.map($(".neuron"), function(neuron, i){
        $(neuron).attr("data-state", state[i]);
      });
    }
  }, '-=200'); // animate off-neurons at same time as on-neurons
}

// Create an animated timeline of chained asynchronous neuron updates
function create_async_timeline(timeline, states) {
  states.forEach(function(value, i){
    if (i == 0) {
      var delay = "-=0";
    }
    else {
      var delay = "-=500";
    }
    timeline.add({
      targets: $('#neuron' + i)[0],
      backgroundColor: [
        {value: val_to_color(value), easing: 'easeOutQuad', duration: 600}
      ],
      scale: [
        {value: .7, easing: 'easeOutSine', duration: 250},
        {value: 1, easing: 'easeInOutQuad', duration: 350}
      ],
      complete: function() {
        // push the numerical values to the neurons
        $('#neuron' + i).attr("data-state", value);
      },
    }, delay);
  });
}

/******************************  MOUSE BINDERS  *******************************/

var mouse_down = false;
$(document).mousedown(function() {
  mouse_down = true;
}).mouseup(function() {
  mouse_down = false;
});

$(".neuron").mouseenter(function() {
  if (mouse_down){
    flip_neuron(this);
  }
});

$(".neuron").mousedown(function() {
  flip_neuron(this);
});

$("#grid").mouseleave(function() {
  mouse_down = false;
});

/**********************************  BUTTONS  *********************************/
$("#clear_grid").click(clear_grid);

$("#store_memory").click(function() {
  let curr_state = pull_net_state();
  W = store_memory(curr_state, memories);
});

$("#wipe_memory").click(function() {
  wipe_memory();
  clear_grid();
});

$("#run_sync").click(function() {
  if (W.length == 0) {
    alert("Network has no memories")
  }
  else {
    run_network_sync();
  }
});

$("#run_async").click(function() {
  if (W.length == 0) {
    alert("Network has no memories")
  }
  else {
    run_network_async();
  }
});

$("#kill").click(kill_oscs);

/*******************************  MISC FRONTEND  ******************************/

$(".slider").on('input', function() {
  new_rows = $("#grid_rows").val();
  new_cols = $("#grid_cols").val();
  change_grid_size(new_rows, new_cols);
  $("#grid_rows_output").html(new_rows);
  $("#grid_cols_output").html(new_cols);
});

function update_num_mems(num) {
  $("#num_mems").html(num);
}

function change_grid_size(num_rows, num_cols) {
  grid_html = "";
  for (let i = 0; i < num_rows * num_cols; i++) {
    grid_html += '<div class="neuron" id="neuron' + i +'" data-state="-1"></div>';
  }
  $('#grid').html(grid_html);
  $('#grid').css({
    "grid-template-columns": "1fr ".repeat([num_cols]),
    "grid-template-rows": "1fr ".repeat([num_rows]),
    "width": 50 * num_cols + 10 * (num_cols - 1) + "px"
  });

  // Re-Bind neurons
  $(".neuron").mouseenter(function() {
    if (mouse_down){
      flip_neuron(this);
    }
  });
  $(".neuron").mousedown(function() {
    flip_neuron(this);
  });

  // clear memories and neuron weights
  wipe_memory();
}
