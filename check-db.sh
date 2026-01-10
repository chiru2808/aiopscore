#!/bin/bash
export PGPASSWORD='aiopsscrect1766675743'
sudo docker exec -e PGPASSWORD=$PGPASSWORD -i aiops-postgres-1 psql -U postgres -d activepieces -c "SELECT id, name FROM platform;"
sudo docker exec -e PGPASSWORD=$PGPASSWORD -i aiops-postgres-1 psql -U postgres -d activepieces -c "SELECT id, email, status FROM \"user\";"
