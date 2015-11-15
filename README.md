# node-shpapad

## schema

### user
- [key]id_token(hashed)
- [value]""

### list
- [key]id_token(hashed)!timestamp
- [value]{name:"listname", count:taskCount}

## task
- [key](id_token(hashed)!timestamp)(hashed)!timestamp
- [value]"task"
