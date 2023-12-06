# main.py



# ------------------------------------------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------------------------------------------
import sys
sys.path.insert(1, 'backend')
import json
from flask import Flask, render_template, request, make_response, jsonify
from backend.live_advance import LiveAdvance
import threading
import time




# ------------------------------------------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------------------------------------------
# Set up BCI stream
id = 'XXXX'
password = 'XXXX'
profile_name = 'XXXX'
stream = LiveAdvance(id, password)


stream.set_start_time(time.time())
stream.set_question_number(-1)

# Function to begin streaming BCI data.
def start_BCI_stream():
    stream.start(profile_name)  # start stream


# ------------------------------------------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------------------------------------------
# Flask App 
app = Flask(__name__, template_folder='frontend')



# ------------------------------------------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------------------------------------------
# Application HTML pages (interfaces)
@app.route('/')
@app.route('/intro')
def open_intro():
    stream.set_start_time(time.time())  # record start time
    stream.set_question_number(-1)  # set question number
    return render_template('intro_exit_pages/intro.html')

@app.route('/exit_intro')
def exit_intro():
    return render_template('intro_exit_pages/exit_intro.html')

@app.route('/exit_test')
def exit_test():
    return render_template('intro_exit_pages/exit_test.html')

@app.route('/a_test')
def a_test():
    return render_template('question_pages/a_test.html')

@app.route('/logic_questions')
def logic_questions():
    return render_template('question_pages/logic_questions.html')



# ------------------------------------------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------------------------------------------
# Other pages 
# Send BCI data (accumulated average) to frontend
@app.route('/BCI_data', methods=['POST', 'GET'])
def BCI_data():
    repsonse = str(stream.average_com())
    stream.average_fac()
    current_time = time.time()
    stream.save_current_avg(current_time)
    print(repsonse)
    return str(repsonse)


# Send timout data to frontend - used for if user not selected answer within timeframe
# send front end average answer during timeframe of question 
@app.route('/timeout_data', methods=['POST', 'GET'])
def timeout_data():
    t_data = stream.average_t()
    print(t_data)
    return str(t_data)


# Update server (backend) with question number front end is currently on 
@app.route('/next_question', methods=['POST'])
def next_question():
    output = request.get_json()
    stream.set_question_number(output)
    stream.clear_timeout()  # clear timout buffer
    return ('', 204)  # Empty content return 


# save data sent from front send (user answers to question)
@app.route('/save_data', methods=['POST'])
def save_data():
    output = request.get_json()
    f = open("user_answers/user_responses.txt", "a")
    f.write(str(output) + '\n')
    f.close()
    return ('', 204)  # Empty content return 



# ------------------------------------------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------------------------------------------
if __name__ == '__main__':
    threading.Thread(target=start_BCI_stream).start()
    threading.Thread(target=app.run(host='0.0.0.0')).start()
  