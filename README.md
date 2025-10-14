# Instructions For Version Control

Create directory on computer where you want project files

cd into directory

command line:

```
git clone https://github.com/nathanialwm/SyllaScribe.git
```

I recommend using VSCode with Github/Git extensions installed, sign into your Github on VSCode

Then when you switch branches it should popup asking if you want to occasionally run `git fetch` Choose yes

Create a branch and switch to it

-Name it dev-{your-name}

```
git checkout -b dev-{your-name}
```

Whenever you make progress you want to save, use 

```git commit -m "your commit message"```

You should make concise commit messages you sum up what you changed

You can also use the built-in commit and push/sync options available in VSCode

You should not push every commit, generally it is best practice to push at end of day, or if you will be using another computer and need to fetch the code from github

For the first push you will need to publish your branch on github

```
git push -u origin-{your-name} {your branch name}
```

After the initial push you can push without the ```-u``` flag

Finally to create a request to merge your code into the master branch, you need to create a pull request

The easiest way to do this is with the online Github UI, when you have changes in your branch that differ from the master branch, there will be an option on your branch page to Pull/ Pull request

Fill out detailed information about what was added and changed within the pull request.

## DO NOT merge yourself.

Every pull request must have at least 1 approval and code review from another member before merging

