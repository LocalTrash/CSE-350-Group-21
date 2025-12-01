def read_file(filepath):
    with open(filepath, "r") as f:
        lines = f.readlines()
    return [line.strip() for line in lines]

def parse_user_pass(user_pass):
    username, password = user_pass.split()
    return username, password

if __name__ == "__main__":
    filepath = "user_pass.txt"
    
    user_pass_list = read_file(filepath)
    
    usernames = []
    passwords = []
    
    for user_pass in user_pass_list:
        username, password = parse_user_pass(user_pass)
        usernames.append(username)
        passwords.append(password)
        
    print("Usernames:", usernames)
    print("Passwords:", passwords)
    
    # Usage example:
    # for i in range(len(usernames)):
    #     test_login(usernames[i], passwords[i])
    
    # Username and password pairs are at the same index in their respective lists
    