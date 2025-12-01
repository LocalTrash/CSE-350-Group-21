import random

numberOfTests = 99

def generate_post_file(filepath, fileName, postDescription, imageSize):
    with open(filepath, "a") as f:
        f.write(f"{fileName} {postDescription} {imageSize}\n")
    return f"{fileName} {postDescription} {imageSize}"
    
def generate_post_description(words):
    return "".join(random.sample(words, 7))

def generate_file_name(letters, fileTypes):
    fileName = "".join(random.choices(letters, k=10)) + random.choice(fileTypes)
    return fileName

def generate_image_size(lowerBoundMinBytes, lowerBoundMaxBytes, upperBoundMinBytes, upperBoundMaxBytes):
    choice = random.randint(1, 10)
    
    if choice > 9:
        bytes = random.randint(upperBoundMinBytes, upperBoundMaxBytes)
    else:
        bytes = random.randint(lowerBoundMinBytes, lowerBoundMaxBytes)
        
    return bytes

if __name__ == "__main__":
    letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    fileTypes = [".png", ".jpg", ".jpeg", ".bmp", ".gif"]
    words = ["hello", "are", "you", "reading", "this", "text", "file", "generate", "image", "description", "code", "python", "script", "random", "words", "file", "name", "example"]

    LBinBytes = int(1024 * 1024 / 2)      # 512 KB
    LBmaxBytes = 2 * 1024 * 1024  # 2 MB
    
    UBminBytes = 5 * 1024 * 1024  # 5 MB
    UBmaxBytes = 10 * 1024 * 1024 # 10 MB
    
    with open("post_values.txt", "w") as f:
        f.write("testing.png abcdefgdescription 204800\n")
    
    for i in range(numberOfTests):
        postDescription = generate_post_description(words)
        choice = random.randint(1, 10)
        if choice <= 9:
            fileName = generate_file_name(letters, fileTypes[:3])
        else:
            fileName = generate_file_name(letters, fileTypes)
        imageSize = generate_image_size(LBinBytes, LBmaxBytes, UBminBytes, UBmaxBytes)

        choice = random.randint(1, 10)
        
        print(generate_post_file("post_values.txt", fileName, postDescription, imageSize))