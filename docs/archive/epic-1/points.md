# last meeting

Affirm that we will develop chiron like a domain specific workflow engine (domain is project management for agentic development) and we will follow the BMad method to populate the workflow engine data

# what we did so far

- initializer workflows
  - greenfield (new)
  - brownfield (existing)
- chat for picking the workflow path
  - project summary (should be named project description)
  - tags (filters for workflow paths) (could extend to workflows as well)
  - project complexity (basically a filter for picking the workflow path)
  - select workflow path (filtered by greenfield and the complexity type)
- tools
  - ax generation (classification tasks for now?) (complexity, workflow path)
    - using optimizers (MiPRO, GEPA, ACE)
      - for the classification tasks i think MiPRO and ACE will work well
      - for GEPA, maybe using already existing equations? in Project Management to optimize different objectives? but i do not see a use case for it yet. i want to though
  - default tool behavior (project description, project name)
- using mastra
  - extending it to using mastra workflows for the artifact workbench (parallel, sequential, etc)

# whats next

- finalize the project initialization
  - create project dir
  - add git initialization (simple-git)
  - set workflow path in db
- brainstorming workflow (first artifact workbench)
  - brainstorming techniques (brainwriting, mind mapping, etc)
  - artifact generation
    - here we might use mastra workflows for sequental/parallel execution of different steps in this workflow
  - artifact evaluation
- project dashboard
  - view workflow executions
  - what to do next
    - taken from the path execution vs workflow path

# unknowns

- how to deal with looping phases
  - the implementation phase
    - its a loop epic 1 -> stories for epic 1 -> validate stories -> epic 2 -> repeat
- freeform chats with agents
  - thinking of having like a tool that has all the available workflows and depending on the convo it determines which workflow to use
- adding general tools
  - web fetch
  - grep
  - glob
  - usual agent stuff (Edit, etc)
    - here is were we might leverage opencode

## TODO

- add templates for projects
- limitations on what kind of projects you can create (domain of project, type of users)
