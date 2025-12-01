def read_file(filepath):
    with open(filepath, "r") as f:
        lines = f.readlines()
    return [line.strip() for line in lines]

def parse_post_file(post_file):
    fileName, postDescription, imageSize = post_file.split()
    return fileName, postDescription, imageSize

if __name__ == "__main__":
    filepath = "post_values.txt"
    
    post_values_list = read_file(filepath)
    
    fileNames = []
    postDescriptions = []
    imageSizes = []

    for post_file in post_values_list:
        fileName, postDescription, imageSize = parse_post_file(post_file)
        fileNames.append(fileName)
        postDescriptions.append(postDescription)
        imageSizes.append(imageSize)

    print("File Names:", fileNames)
    print("Post Descriptions:", postDescriptions)
    print("Image Sizes:", imageSizes)

    # Usage example:
    # for i in range(len(fileNames)):
    #     test_create_post(fileNames[i], postDescriptions[i], imageSizes[i])

    # File name, post description, and image size pairs are at the same index in their respective lists
    