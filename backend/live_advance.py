# -----------------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------------
# This class is adapted from the LiveAdvanced class within Cortex by Emotiv
# See https://emotiv.gitbook.io/cortex-api/ for more details on Cortex code and API
# This class has some additional features from the original code including:
#   1. A buffer to store the streamed data (thread safe)
#   2. A function to average the buffer (thread safe)
#   3. A function that averages a bigger buffer of all the streamed data
#   4. A function to clear the buffer (thread safe)
# -----------------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------------
import cortex
from cortex import Cortex
from threading import Semaphore
from collections import Counter
import csv


# -----------------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------------
class LiveAdvance():
    """
    A class to show mental command data at live mode of trained profile.
    You can load a profile trained on EmotivBCI or via train.py example

    Attributes
    ----------
    c : Cortex
        Cortex communicate with Emotiv Cortex Service

    Methods
    -------
    start():
        To start a live mental command  process from starting a websocket
    load_profile(profile_name):
        To load an existed profile or create new profile for training
    unload_profile(profile_name):
        To unload an existed profile or create new profile for training
    get_active_action(profile_name):
        To get active actions for the mental command detection.
    get_sensitivity(profile_name):
        To get the sensitivity of the 4 active mental command actions.
    set_sensitivity(profile_name):
        To set the sensitivity of the 4 active mental command actions.
    """
    def __init__(self, app_client_id, app_client_secret, **kwargs):
        self.c = Cortex(app_client_id, app_client_secret, debug_mode=False, **kwargs)
        self.c.bind(create_session_done=self.on_create_session_done)
        self.c.bind(query_profile_done=self.on_query_profile_done)
        self.c.bind(load_unload_profile_done=self.on_load_unload_profile_done)
        self.c.bind(save_profile_done=self.on_save_profile_done)
        self.c.bind(new_com_data=self.on_new_com_data)
        self.c.bind(new_fe_data=self.on_new_fe_data)
        self.c.bind(get_mc_active_action_done=self.on_get_mc_active_action_done)
        self.c.bind(mc_action_sensitivity_done=self.on_mc_action_sensitivity_done)
        self.c.bind(inform_error=self.on_inform_error)

        self.com_buffer = []
        self.fac_buffer = []
        self.avg_com_buffer = []
        self.avg_fac_buffer = []
        self.t_buffer = []
        self.com_lock = Semaphore(1)
        self.fac_lock = Semaphore(1)
        self.t_lock = Semaphore(1)

        self.question_number = -1
        self.start_time = 0



# -----------------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------------
    def start(self, profile_name, headsetId=''):
        """
        To start live process as below workflow
        (1) check access right -> authorize -> connect headset->create session
        (2) query profile -> get current profile -> load/create profile
        (3) get MC active action -> get MC sensitivity -> set new MC sensitivity -> save profile
        (4) subscribe 'com' data to show live MC data
        Parameters
        ----------
        profile_name : string, required
            name of profile
        headsetId: string , optional
             id of wanted headset which you want to work with it.
             If the headsetId is empty, the first headset in list will be set as wanted headset
        Returns
        -------
        None
        """

        if profile_name == '':
            raise ValueError('Empty profile_name. The profile_name cannot be empty.')

        self.profile_name = profile_name
        self.c.set_wanted_profile(profile_name)

        if headsetId != '':
            self.c.set_wanted_headset(headsetId)

        self.c.open()
        


# -----------------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------------
    def load_profile(self, profile_name):
        """
        To load a profile

        Parameters
        ----------
        profile_name : str, required
            profile name

        Returns
        -------
        None
        """
        self.c.setup_profile(profile_name, 'load')


    def unload_profile(self, profile_name):
        """
        To unload a profile
        Parameters
        ----------
        profile_name : str, required
            profile name

        Returns
        -------
        None
        """
        self.c.setup_profile(profile_name, 'unload')


    def save_profile(self, profile_name):
        """
        To save a profile

        Parameters
        ----------
        profile_name : str, required
            profile name

        Returns
        -------
        None
        """
        self.c.setup_profile(profile_name, 'save')


    def subscribe_data(self, streams):
        """
        To subscribe to one or more data streams
        'com': Mental command
        'fac' : Facial expression
        'sys': training event

        Parameters
        ----------
        streams : list, required
            list of streams. For example, ['sys']

        Returns
        -------
        None
        """
        self.c.sub_request(streams)


    def get_active_action(self, profile_name):
        """
        To get active actions for the mental command detection.
        Maximum 4 mental command actions are actived. This doesn't include "neutral"

        Parameters
        ----------
        profile_name : str, required
            profile name

        Returns
        -------
        None
        """
        self.c.get_mental_command_active_action(profile_name)


    def get_sensitivity(self, profile_name):
        """
        To get the sensitivity of the 4 active mental command actions. This doesn't include "neutral"
        It will return arrays of 4 numbers, range 1 - 10
        The order of the values must follow the order of the active actions, as returned by mentalCommandActiveAction
        If the number of active actions < 4, the rest numbers are ignored.

        Parameters
        ----------
        profile_name : str, required
            profile name

        Returns
        -------
        None
        """
        self.c.get_mental_command_action_sensitivity(profile_name)


    def set_sensitivity(self, profile_name, values):
        """
        To set the sensitivity of the 4 active mental command actions. This doesn't include "neutral".
        The order of the values must follow the order of the active actions, as returned by mentalCommandActiveAction
        
        Parameters
        ----------
        profile_name : str, required
            profile name
        values: list, required
            list of sensitivity values. The range is from 1 (lowest sensitivy) - 10 (higest sensitivity)
            For example: [neutral, push, pull, lift, drop] -> sensitivity [7, 8, 3, 6] <=> push : 7 , pull: 8, lift: 3, drop:6
                         [neutral, push, pull] -> sensitivity [7, 8, 5, 5] <=> push : 7 , pull: 8  , others resvered

        Returns
        -------
        None
        """
        self.c.set_mental_command_action_sensitivity(profile_name, values)


    def set_question_number(self, new_number):
        self.question_number = new_number

        
    def set_start_time(self, time):
        self.start_time = time


# -----------------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------------
    # callbacks functions
    def on_create_session_done(self, *args, **kwargs):
        print('on_create_session_done')
        self.c.query_profile()


    def on_query_profile_done(self, *args, **kwargs):
        print('on_query_profile_done')
        self.profile_lists = kwargs.get('data')
        if self.profile_name in self.profile_lists:
            # the profile is existed
            self.c.get_current_profile()
        else:
            # create profile
            self.c.setup_profile(self.profile_name, 'create')


    def on_load_unload_profile_done(self, *args, **kwargs):
        is_loaded = kwargs.get('isLoaded')
        print("on_load_unload_profile_done: " + str(is_loaded))
        
        if is_loaded == True:
            # get active action
            self.get_active_action(self.profile_name)
        else:
            print('The profile ' + self.profile_name + ' is unloaded')
            self.profile_name = ''


    def on_save_profile_done (self, *args, **kwargs):
        print('Save profile ' + self.profile_name + " successfully")
        # subscribe mental command data 'com' and facial expression data 'fac
        stream = ['com', 'fac']
        self.c.sub_request(stream)


    def on_get_mc_active_action_done(self, *args, **kwargs):
        data = kwargs.get('data')
        print('on_get_mc_active_action_done: {}'.format(data))
        self.get_sensitivity(self.profile_name)


    def on_mc_action_sensitivity_done(self, *args, **kwargs):
        data = kwargs.get('data')
        print('on_mc_action_sensitivity_done: {}'.format(data))
        if isinstance(data, list):
            # get sensitivity
            new_values = [7,7,5,5]
            self.set_sensitivity(self.profile_name, new_values)
        else:
            # set sensitivity done -> save profile
            self.save_profile(self.profile_name)


    def on_inform_error(self, *args, **kwargs):
        error_data = kwargs.get('error_data')
        error_code = error_data['code']
        error_message = error_data['message']
        print(error_data)
        if error_code == cortex.ERR_PROFILE_ACCESS_DENIED:
            # disconnect headset for next use
            print('Get error ' + error_message + ". Disconnect headset to fix this issue for next use.")
            self.c.disconnect_headset()



# -----------------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------------
# On new data Functions

    # When new command data is received store it in the buffer
    def on_new_com_data(self, *args, **kwargs):
        # Data is as follows:
        # action: range(right, left, neutral) - type of command
        # power: range(0 - 1) - strength of command
        self.com_lock.acquire() # Acquire lock
        data = kwargs.get('data')
        # print('mc data: {}'.format(data))
        self.com_buffer.append(data) 
        self.com_lock.release() # Release Lock


    # When new facial expression data is received store it in buffer
    def on_new_fe_data(self, *args, **kwargs):
        # Data is as follows:
        # eyeAct: range (wink left, wink right, blink) - eye action
        # uAct: range(furrowed brows, raised brows) - upper facial action
        # uPow: range(0 - 1) - upper facial action power 
        # lAct: range(smile, clenched teeth, laugh) - lower facial action
        # lPow: range(0 - 1) - lower facial action power
        self.fac_lock.acquire()  # Acquire lock
        data = kwargs.get('data')
        # print('facial data: {}'.format(data))
        self.fac_buffer.append(data)
        self.fac_lock.release()  # release lock
  
        

# -----------------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------------
# Averaging Data Functions

    # Average com data
    def average_com(self):
        self.add_data()  # add test data

        self.com_lock.acquire() # Lock for thread safety

        # For avg combine power and action to one data point instead of 2 separate - for this
        # convert left to negative (-1 to 0) and right wil be positive (0 to 1) - neutral is ignored
        # Average here will be a number between -1 and 1 corresponding to the average of the  buffer
        # i.e. if avg is more negative there were more and/or stronger powered left commands in the buffer

        # If buffer empty
        if (len(self.com_buffer) <= 0):
            return 0 
        
        sum = 0
        count = 0
        for i in self.com_buffer:
            # Convert all left power to negative
            if i['action'] == 'left':
                i['power'] = i['power'] * -1 
            # Calculate total (ignore neutral)
            if i['action'] != 'neutral':
                sum += i['power']
                count += 1

        if count == 0: 
            total = 0
        else:    
            total = sum/ count

        self.avg_com_buffer.append(total)
        self.com_buffer.clear()  # Clear buffer for next set of data    
        self.com_lock.release()  # Unlock

        # Add to timeout buffer
        self.t_lock.acquire()
        self.t_buffer.append(total)
        self.t_lock.release()

        return total  # Return avg power


    # Average com data  
    def average_fac(self):
        self.add_data()  # Add test data
        self.fac_lock.acquire()  # Lock
        
        # Empty average 
        avg = {'eyeAct': 'neutral', 'uAct': 'neutral', 'uPow': 0.0, 'lAct': 'neutral', 'lPow': 0.0}

        if (len(self.fac_buffer) <= 0):    
            self.fac_lock.release()  # Unlock
            return avg # return empty avg if buffer is empty
        
        # Find most frequent eye action
        eyeAct_c = Counter(i['eyeAct'] for i in self.fac_buffer) # count all eye actions
        # most_common()[0][0] shows the most common action while most_common()[0][1] shows the count of said action
        avg['eyeAct'] = eyeAct_c.most_common()[0][0]

        # Most frequent upper facial expression action
        uAct_c = Counter(i['uAct'] for i in self.fac_buffer)
        avg['uAct'] = uAct_c.most_common()[0][0]

        # Average power for the most common upper facial action
        avg['uPow'] = float(sum(i['uPow'] for i in self.fac_buffer if i['uAct'] == avg['uAct'])) / uAct_c.most_common()[0][1]

        # Most frequent lower facial expression
        lAct_c = Counter(i['lAct'] for i in self.fac_buffer)
        avg['lAct'] = lAct_c.most_common()[0][0]

        # Average power for the most common lower facial expression
        avg['lPow'] = float(sum(i['lPow'] for i in self.fac_buffer if i['lAct'] == avg['lAct'])) / lAct_c.most_common()[0][1]
        
        self.avg_fac_buffer.append(avg)
        self.fac_buffer.clear()  # clear buffer for next round data
        self.fac_lock.release()  # Unlock
        return avg
    

    # Calculate the timout out average data 
    def average_t(self):
        self.t_lock.acquire()
        total = 0
        total += sum(self.t_buffer)
        self.t_lock.release()
        return total
    

    def clear_timeout(self):
        self.t_lock.acquire()
        self.t_buffer.clear()  # clear timout buffer as question was answered
        self.t_lock.release()


# -----------------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------------
# Functions related to saving data
    # Create CSV and Add header to file
    header = ['question_number', 'time', 'com_power', 'eyeAct', 'uAct', 'uPow', 'lAct', 'lPow']
    with open('user_answers/user_recordings.csv', 'w') as f:
        w = csv.writer(f)
        w.writerow(header)



    def save_current_avg(self, time):
        c_time = time - self.start_time  # time elapsed since starting 

        # Acquire data from buffer - thread safe
        self.fac_lock.acquire()
        self.com_lock.acquire()

        if len(self.avg_fac_buffer) == 0:  # If  buffer empty 
            eyeAct = 'NaN'
            uAct = 'NaN'
            uPow = 'NaN'
            lAct = 'NaN'
            lPow = 'NaN'
        else:
            fac_data = self.avg_fac_buffer[-1] # -1 for last entry in buffers
            # extract data for facial expression
            eyeAct = fac_data['eyeAct']
            uAct = fac_data['uAct']
            uPow = fac_data['uPow']
            lAct = fac_data['lAct']
            lPow = fac_data['lPow']

        if len(self.avg_com_buffer) == 0:
            com = 'NaN'
        else:
            com = self.avg_com_buffer[-1]

        self.fac_lock.release()
        self.com_lock.release()


        # create new entry for CSV with structure:
        # [time, question number, avg mental command (for this time frame - 0.1s), avg facial expression (for this time frame)]
        new_entry = [self.question_number, c_time, com, eyeAct, uAct, uPow, lAct, lPow]  

        # write new entry to CSV
        with open('user_answers/user_recordings.csv', 'a') as f:
            w = csv.writer(f)
            w.writerow(new_entry)
      
        


# -----------------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------------
    # For testing application without needed to connect to headset
    def add_data(self):
        # Acquire buffer locks
        self.com_lock.acquire()
        self.fac_lock.acquire()

        # move left by 0.14
        # self.com_buffer.append({'action': 'right',    'power': 1,  'time': 1})
        # self.com_buffer.append({'action': 'left',   'power': 1,  'time': 2})
        # self.com_buffer.append({'action': 'left',   'power': 1,  'time': 3})
        # self.com_buffer.append({'action': 'neutral', 'power': 1,  'time': 4})
        # self.com_buffer.append({'action': 'neutral', 'power': 1,  'time': 5})
        # self.com_buffer.append({'action': 'right',    'power': 1,  'time': 6})
        # self.com_buffer.append({'action': 'right',    'power': 1,  'time': 7})
        # self.com_buffer.append({'action': 'left',    'power': 1,  'time': 8})
        # self.com_buffer.append({'action': 'neutral', 'power': 1,  'time': 9})
        # self.com_buffer.append({'action': 'left',    'power': 1,  'time': 10})

        # move right by 0.14
        # self.com_buffer.append({'action': 'right',    'power': 1,  'time': 1})
        # self.com_buffer.append({'action': 'left',   'power': 1,  'time': 2})
        # self.com_buffer.append({'action': 'left',   'power': 1,  'time': 3})
        # self.com_buffer.append({'action': 'neutral', 'power': 1,  'time': 4})
        # self.com_buffer.append({'action': 'neutral', 'power': 1,  'time': 5})
        # self.com_buffer.append({'action': 'right',    'power': 1,  'time': 6})
        # self.com_buffer.append({'action': 'left',    'power': 1,  'time': 7})
        # self.com_buffer.append({'action': 'right',    'power': 1,  'time': 8})
        # self.com_buffer.append({'action': 'neutral', 'power': 1,  'time': 9})
        # self.com_buffer.append({'action': 'right',    'power': 1,  'time': 10})

        # # Add facial test data
        # self.fac_buffer.append({'eyeAct': 'l_wink', 'uAct': 'neutral', 'uPow': 1.0, 'lAct': 'laugh', 'lPow': 1.0, 'time': 1})
        # self.fac_buffer.append({'eyeAct': 'blink', 'uAct': 'surprised', 'uPow': 1.0, 'lAct': 'smile', 'lPow': 1.0, 'time': 2})
        # self.fac_buffer.append({'eyeAct': 'blink', 'uAct': 'surprised', 'uPow': 0.0, 'lAct': 'smile', 'lPow': 1.0, 'time': 3})
        # self.fac_buffer.append({'eyeAct': 'blink', 'uAct': 'neutral', 'uPow': 0.0, 'lAct': 'frown', 'lPow': 0.0, 'time': 4})
        # self.fac_buffer.append({'eyeAct': 'neutral', 'uAct': 'neutral', 'uPow': 0.0, 'lAct': 'laugh', 'lPow': 0.0, 'time': 5})
        # self.fac_buffer.append({'eyeAct': 'r_wink', 'uAct': 'neutral', 'uPow': 0.0, 'lAct': 'laugh', 'lPow': 1.0, 'time': 6})
        
        # Release locks
        self.com_lock.release()
        self.fac_lock.release()
