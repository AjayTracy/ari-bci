// Disorganised Thinking - logic Test Javascript file


// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Page variables 
var strength = 150  // strength is multiplied by power to determine how much the dot moves
var req_interval = 500  // request data interval time in ms
var timeout_interval = 10000  // how long to wait before timing out in ms
var timeout_interval_ID; 

// Questions
var q1 = {question: 'Will a stone float on water?',          answer: 'no' };
var q2 = {question: 'Are there fish in the sea?',            answer: 'yes'};
var q3 = {question: 'Does one pound weight more than two?',  answer: 'no' };
var q4 = {question: 'Can you use a hammer to pound a nail?', answer: 'yes'};
var q_list = [q1.question, q2.question, q3.question, q4.question];  // List of all questions
var q_answers = [q1.answer, q2.answer, q3.answer, q4.answer]    // List of answers

var current_question = 0;
var answers = {}  // Dictionary for user score 
var user_answers = {}  // Dictionary for user answers


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
            url : 'ws://ari-17c:9090'  // port for ari screen
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

    // say question
    ros_bridge.sayFrase(
        "I am now going to ask you some questions."
    )
    ros_bridge.sayFrase(
        "Please indicate your answer by selecting the red box on the left for No and the green box on the right for Yes."
    )
    
    setup_dot();  // Set up dot - place in middle of screen and initialise values
    setup_box_pos();  // Set x, y, width and height to yes and no boxes for collision detection
    setup_question()  // Add first question to screen
})



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// run program
var req_interval_ID = setInterval(data_req, req_interval); // Run data request every x milliseconds




// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Data request variables
var xhr = new XMLHttpRequest();
var method = 'GET';
var url = '/BCI_data'
var power = 0;  // BCI variable for how much to move dot


// On data request successful update power and action to BCI stream
xhr.onreadystatechange = function() {
  if (this.readyState == 4 && this.status == 200) {
    power = parseFloat(this.response)
  }
};


// Function to request for BCI data and move dot
function data_req() {
    xhr.open(method, url, true);
    xhr.send();
    move_dot();
}



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Timeout function
function timeout() {
     sel = get_timeout_data();  // Get timeout data (most common response from current question)
     // use data to set answer to current question
    if (sel > 0) {
        answer_selection('yes')
    }
    else if (sel < 0) {
        answer_selection('no')
    }
    else {
        answer_selection('NaN')
    }
}

// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// For dot movement and answer selection
// Function to move dot by power in direction. Also updates postions and answer list accordingly 
function move_dot() {
    power = power * 100;  // increase power by factor of 100
    dot.style.left = parseInt(dot.style.left) + power + 'px';  // Move dot by amount of power
    update_dot_pos();  // update dot position
    // send update to server when this feature test is complete 
    if (current_question == q_list.length) { next_test() }
    // Check if answer is chosen and update accordingly
    if (colision_detection(dot, no_box)) { answer_selection('no') }
    else if (colision_detection(dot, yes_box)) { answer_selection('yes') };  
}


function answer_selection(ans) {
    clearTimeout(timeout_interval_ID) // rest timer for timout function
    update_answer(ans);  // Record user answer
    update_question();  // Display new question
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
// Display the first question on the screen
function setup_question(){    
    send_q_update()  // send current question to backend    
    timeout_interval_ID = setTimeout(timeout, timeout_interval);
    let x = q_list[current_question]
    ros_bridge.sayFrase(x)

    // let question = document.getElementById("current_question");
    // question.innerHTML = x;
    
}


// Inital dot set up
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


// Update display with next question
function update_question() {
    current_question += 1;  // Update to next question   
    send_q_update()  // send current question to backend  
    timeout_interval_ID = setTimeout(timeout, timeout_interval);
    let x = q_list[current_question];
    ros_bridge.sayFrase(x)

    // let c_question = document.getElementById("current_question");
    // c_question.innerHTML = x;
}


// Store user answer to question
function update_answer(response) {
    // user score - grade on how correct the answer is 
    if (q_answers[current_question] == response) {
        // If user gets answer right record 1 for correct and 0 for incorrect
        answers['Q' + (10 + parseInt(current_question))] = 1;  // + 10 as there are 10 letters in 'A' test (10 + current question is being asked)
    }
    else {
        // If user get question wrong 
        answers['Q' + (10 + parseInt(current_question))] = 0;  
    }
    // + 10 as there are 10 letters in 'A' test (10 + current question is being asked)
    user_answers[10 + current_question] = response;  
}



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Server based functions
// Send update to server when test is complete and move on to next page
function next_test() {    
    clearInterval(req_interval_ID)  // stop calling to server for BCI data 
    clearInterval(timeout_interval_ID)  // stop calling timeout
    save_answers()  // save user answers and scores to server
    window.location.href="exit_test";  // update display to next screen
}

// Save answers from test to server 
function save_answers() {
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
        data: JSON.stringify(user_answers),
        error: function(error) {
            console.log(error);
        }
    });
}


// Update server with current question
function send_q_update() {
    q = 10 + parseInt(current_question); 
    $.ajax({
        type: 'POST',
        url: '/next_question',
        contentType: 'application/json',
        data: JSON.stringify(q ),
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
    // send update to server when this feature test is complete 
    if (current_question == q_list.length) { next_test() }
    // Check if answer is chosen and update accordingly
    if (colision_detection(dot, no_box)) { answer_selection('no') }
    else if (colision_detection(dot, yes_box)) { answer_selection('yes') };
})





