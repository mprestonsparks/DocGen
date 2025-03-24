# GET-TO-WORK
- The purpose of the get-to-work script is to encapsulate all the procedures I would follow while working on the project into a single procedure. My hope is, by implementing this script, the velocity of my productivity will increase significantly.  
  
- Here's a quick overview of the procedures and thought behind the get-to-work script:  
- Imagine we conceive of "work" as falling under one of three categories: "testing", "issues", and "TODOs"  
  
## START OF PROCEDURE  
- My personal procedure (and the intended procedure of the get-to-work script) is as follows:  

### TESTING PHASE  
- Run all the tests in the project  
- Review the results of the tests  
- Identify the underlying problems causing the test failures  
- Determine if the test is wrong, or if the code is wrong  
- Make the necessary corrections to the tests or code  
- Re-run the tests to verify the problems have been resolved  

### ISSUES PHASE  
- Review all the currently "open" github Issues in the project  
- Analyze how the open issues relate to each other and mentally categorize them into a hierarchy (to identify dependencies between issues, etc.)  
- Using the results of the previous step, mentally construct a list using all the open issues, ordering them by rank (where the "rank" is used to determine which issue to work on first, in order to minimize the chances of having to work on the same issue multiple times due to subsequent changes from other issues that affected the earlier completed issue)  
- Perform all the work required to close each open issue until there are 0 open issues  

### TODO PHASE  
- Search the entire codebase for any "TODO" annotations/comments within any files  
- Construct a temporary list of TODO items  
- Analyze the list containing all the TODO items  
- Determine if any of the TODO items share common tasks/requirements  
- Create a new github Issue for tasks that correspond to multiple TODO items  
- Perform the tasks required to implement the simple TODO items which were not associated with a new github Issue in the previous step  
- Analyze each file in the project to identify new TODO annotations that need to be added in the file (this should ideally be done algorithmically rather than my manual approach)  
- Add the new TODO annotations in the files  

## END OF PROCEDURE  
This procedure loops, meaning I start back at the first step and repeat each step in the same order. In doing this, the project can be developed to completion and be fully-tested and free of errors.  