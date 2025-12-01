import random

numberOfTests = 99

def generate_user_pass_file(username, password):
    with open("user_pass.txt", "a") as f:
        f.write(f"{username} {password}\n")
    return f"{username} {password}"

def generate_password(symbols):
    password = ''.join(random.choice(symbols) for i in range(12))
    return password

def generate_user(letters, domain):
    username = ''.join(random.choice(letters) for i in range(8)) + random.choice(domain)
    return username

if __name__ == "__main__":
    letters = "abcdefghijklmnopqrstuvwxyz"
    symbols = letters + "!@#$%^&*()_+" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    domain = ["@louisville.edu" "@gmail.com", "@yahoo.com"]

    with open("user_pass.txt", "w") as f:
        f.write(f"abc@domain.ext 123456\n")

    for i in range(numberOfTests):
        choice = random.randint(1, 10)
        if choice <= 9:
            username = generate_user(letters, domain[:1])
        else:
            username = generate_user(letters, domain[1:])

        password = generate_password(symbols)
        print(generate_user_pass_file(username, password))