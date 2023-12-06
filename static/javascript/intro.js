// Intro page to delirium detection test - Javascript File



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Page variables 
var strength = 100  // strength is multiplied by power to determine how much the dot moves



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Document elements 
var dot = document.getElementById('main_dot');
var exit_box = document.getElementById('exit_box');
var enter_box = document.getElementById('enter_box');



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
ros_bridge.sayFrase(
    "Hi, my name is ARI. I am here to administer a delirium detection test. To proceed to the test please use your headset to select the green box labled enter on the right side. To exit please select the red box labled exit on the left side"
)



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Initial screen set up on loading window
window.addEventListener('load', () => {
    setup_dot();  // set up dot - place in middle of screen and initialise values
    setup_box_pos();  // Set x, y, width and height to yes and no boxes for collision detection

})



// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// Run program 
 // Run data request every x milliseconds
 setInterval(data_req, 500); 




// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// For dot movement - Data stream from BCI headset
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

// Function to move dot by power in direction. Also updates positions and answer list accordingly
function move_dot() {
    power = power * strength  // increase power by strength
    dot.style.left = parseInt(dot.style.left) + power + 'px';  // Move dot by amount of power

    update_dot_pos();  // update dot position

    // Get webpage based on user selection
    if (colision_detection(dot, exit_box)) {
        window.location.href="/exit_intro"; 
    };

    if (colision_detection(dot, enter_box)) {
        window.location.href="a_test"
    }; 
}

// Function to request for BCI data and move dot
function data_req() {
    xhr.open(method, url, true);
    xhr.send();
    move_dot();
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
    let enter_pos = enter_box.getBoundingClientRect()
    enter_box.x = enter_pos.left - 50; // needs off set to match box width
    enter_box.y = enter_pos.top
    enter_box.w = document.getElementById("enter_box").offsetWidth;

    let exit_pos = exit_box.getBoundingClientRect()
    exit_box.x = exit_pos.left;
    exit_box.y = exit_pos.top
    exit_box.w = document.getElementById("exit_box").offsetWidth;
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




// -----------------------------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------
// FOR TESTING
// MOVE DOT WITH ARROW KEYS
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

    // Get webpage based on user selection
    if (colision_detection(dot, exit_box)) {
        window.location.href="/exit_intro"; 
    };

    if (colision_detection(dot, enter_box)) {
        window.location.href="a_test"
    }; 
})
