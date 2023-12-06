// Inattention - A's Test Javascript file



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Page variables 
var strength = 150  // strength is multiplied by power to determine how much the dot moves
var req_interval = 500;  // How often to request data from sever ms
var timeout_interval = 10000;  // How long to wait before timing out for each question/letter
var timeout_interval_ID;  // timeout if no response within time frame

var selected_word = 'SAVEAHAART';  // selected word (only use one for all participants as no learning is occurring)
var current_letter = 0;  // current letter of word
var answers = {word: selected_word};  // Dictionary for user score (i.e. if the user got the question correct)
var user_answers = {word: selected_word};  // Dictionary for user answers



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Document elements 
var dot = document.getElementById('main_dot');
var no_box = document.getElementById('no_box');
var yes_box = document.getElementById('yes_box');



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// ROS Bridge for ARI
// Class and function to have front end sync to ARI (robot) - bridge front end and ARI
const ROSLIB = window.ROSLIB;  // use roslib
class ROSApp {
    constructor() {
        this.ros = new ROSLIB.Ros({
            url : 'ws://ari-17c:9090'   // port for ari screen

            // 'ws://ari-17c:9090' 
            // 'ws://192.168.1.105:9090' 
            //'ws://' + window.location.hostname + ':9090'

        });

        // client for voice 
        this.ttsClient = new ROSLIB.ActionClient({
            ros : this.ros,
            serverName : '/tts',
            actionName : 'pal_interaction_msgs/TtsAction'
        });
    }

    // Function to send text to ari for text to speech 
    sayFrase(text) {
        var goal = new ROSLIB.Goal({
            actionClient : this.ttsClient,
            goalMessage : {
                rawtext: {
                    text: text,
                    lang_id: "en_GB"
                }
            }
        });
        goal.send();
    }
};
    
ros_bridge = new ROSApp();  // create variable ros bridge variable 




// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Initial screen set up on loading window
window.addEventListener('load', () => {

    // Say question
    ros_bridge.sayFrase(
        'I am going to read you a series of 10 letters.'
    )
    ros_bridge.sayFrase(
        'Whenever you hear the letter A, indicate by selecting the green box labled yes.'
    )

    setup_dot();  // set up dot - place in middle of screen and initialise values
    setup_box_pos();  // Set x, y, width and height to yes and no boxes for collision detection
    setup_letter()  // Add selected first letter of word on screen

})




// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// run program
var req_interval_ID = setInterval(data_req, req_interval); // Run data request every x milliseconds



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Data stream from BCI headset
// Data request variables
var BCI_xhr = new XMLHttpRequest();
var BCI_method = 'GET';
var BCI_url = '/BCI_data'
var power = 0;  // BCI variable for how much to move dot

// On data request successsfull update power using BCI stream
BCI_xhr.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    power = parseFloat(this.response)
  }
};

// Function to request for BCI data and move dot
function data_req() {
    BCI_xhr.open(BCI_method, BCI_url, false);
    BCI_xhr.send();
    move_dot();  // move dot based on BCI data
}


 
// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Timeout function
function timeout() {
     sel = get_timeout_data();  // Get timeout data (most common response from current letter/question)
     // use data to set answer to current letter
    if (sel > 0) {  // >1 Means more to right (yes box)
        answer_selection('yes')
    }
    else if (sel < 0) {  // <1 Means more to left (no box)
        answer_selection('no')
    }
    else {  // for no selection
        answer_selection('NaN')
    }
}



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// For dot movement and answer selection
// Function to move dot by power in direction. Also updates positions and answer list accordingly
function move_dot() {
    power = power * strength  // increase power by factor of strength
    dot.style.left = parseInt(dot.style.left) + power + 'px';  // Move dot by amount of power
    update_dot_pos();  // update dot position
    // If 'A' test is complete send update to server and move on
    if (current_letter == selected_word.length) { 
        next_test(); 
    };  
    // Check if answer is chosen and update accordingly
    if (colision_detection(dot, no_box)) { answer_selection('no') }
    else if (colision_detection(dot, yes_box)) { answer_selection('yes') };  
}


function answer_selection(ans) {
    clearTimeout(timeout_interval_ID) // rest timer for timout function
    update_answer(ans);  // Record user answer
    update_letter();  // Display new letter
    setup_dot();  // Reset the dot
}



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Choice detection - using circle-rectangle collision detection
function colision_detection(dot, box) {
    var distX = Math.abs(dot.x - box.x-box.w/2);  // Calculate absolute distance between dot and box (option)
    // Return false if dot is not touching the choices (box)
    if (distX > (box.w/2 + dot.r)) { return false; }
    // Return true if dot touching choice (box)
    if (distX <= (box.w/2)) { return true; } 
}



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Set up functions
// Set up word on display
function setup_letter(){  
    send_q_update()  // send current question to backend
    timeout_interval_ID = setTimeout(timeout, timeout_interval);
    let x = JSON.stringify(selected_word.charAt(current_letter))  // current letter of word
    ros_bridge.sayFrase(x)

}


// Initial dot set up
function setup_dot() {
    // set dot position
    dot.style.position = 'absolute';
    let screen_w = screen.width / 2;
    dot.style.left = screen_w + 'px';
    let screen_h = screen.height / 2;
    dot.style.top = screen_h + 'px';
    // assign dot values (x, y, r)
    let dot_pos = dot.getBoundingClientRect()
    dot.x = dot_pos.left;
    dot.y = dot_pos.top;
    dot.r = document.getElementById("main_dot").offsetWidth / 2;
}


// Assign box (choices) values (x, y w, h)
function setup_box_pos() {
    // set up yes box
    let yes_pos = yes_box.getBoundingClientRect()
    yes_box.x = yes_pos.left - 50; // needs off set to match box width
    yes_box.y = yes_pos.top
    yes_box.w = document.getElementById("yes_box").offsetWidth;
    // set up no box
    let no_pos = no_box.getBoundingClientRect()
    no_box.x = no_pos.left;
    no_box.y = no_pos.top
    no_box.w = document.getElementById("no_box").offsetWidth;
}


// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Update functions
// Update dot position after movement
function update_dot_pos() {
    let dot_pos = dot.getBoundingClientRect()
    dot.x = dot_pos.left;
    dot.y = dot_pos.top;
}

// Update display with next letter
function update_letter() {
    current_letter += 1;  // Update to next letter
    send_q_update()  // send current question to backend
    timeout_interval_ID = setTimeout(timeout, timeout_interval);
    let x = JSON.stringify(selected_word.charAt(current_letter)) 
    ros_bridge.sayFrase(x);   
}

// Store user answer to question
function update_answer(response) {
    let letter = selected_word.charAt(current_letter);

    // record user score - score for answer to question i.e. {'Q1': 1}
    if (letter == "A" && response == "yes") {
        answers['Q' + current_letter] = 1;  // 1 for correct
    }
    else if (letter == "A" && response == "no") {
        answers['Q' + current_letter] = 0;  // 0 for wrong
    }
    else if (letter != "A" && response == "yes") {
        answers['Q' + current_letter] = 0;
    }
    else if (letter != "A" && response == "no") {
        answers['Q' + current_letter] = 1;
    }
    else if (response == 'NaN') {
        answers['Q' + current_letter] = 'NaN';
    }

    // record user response - user response will be letter as key i.e. {'A': yes}
    user_answers[current_letter] = response;
}



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Server (backend) related functions
// Send all updates to server when test is complete
function next_test() {    
    clearInterval(req_interval_ID)  // stop calling to server for BCI data
    clearTimeout(timeout_interval_ID)  // stop calling timeout
    save_answers()  // save user answers and scores to server
    window.location.href="logic_questions";  // update display to next screen
}


// Save answers from this feature test
function save_answers() {
    // AJAX request to send data to server (backend)
    // for user score
    $.ajax({
        type: 'POST',
        url: '/save_data',
        contentType: 'application/json',
        data: JSON.stringify(answers),  // convert to string
        error: function(error) {
            console.log(error);
        }
    });

    // for user answer
    $.ajax({
        type: 'POST',
        url: '/save_data',
        contentType: 'application/json',
        data: JSON.stringify(user_answers),  // convert to string
        error: function(error) {
            console.log(error);
        }
    });
}


// Update server with current question (letter) number 
function send_q_update() {
    $.ajax({
        type: 'POST',
        url: '/next_question',
        contentType: 'application/json',
        data: JSON.stringify(current_letter),  // convert to string
        error: function(error) {
            console.log(error);
        }
});
}


function get_timeout_data() {
    var timeout_xhr = new XMLHttpRequest();
    var timeout_method = 'GET';
    var timeout_url = '/timeout_data'
    var rep
    // on state change of request
    timeout_xhr.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            rep = parseFloat(this.response)
        }
      };
    // send data request
    timeout_xhr.open(timeout_method, timeout_url, false);
    timeout_xhr.send();

    return rep
}



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// FOR TESTING ONLY - MOVE DOT WITH ARROW KEYS - same function as move_dot however without BCI data
window.addEventListener('keyup', (e) => {
    let power = 100;
    switch(e.key) {
        case 'ArrowLeft':
           dot.style.left = parseInt(dot.style.left) - power + 'px';
           break;
        case 'ArrowRight':
            dot.style.left = parseInt(dot.style.left) + power + 'px';
            break;
    }
    update_dot_pos();  // update dot position
    // If 'A' test is complete send update to server and move on
    if (current_letter == selected_word.length) { next_test() };  
    // Check if answer is chosen and update accordingly
    if (colision_detection(dot, no_box)) { answer_selection('no') }
    else if (colision_detection(dot, yes_box)) { answer_selection('yes') };  
})


