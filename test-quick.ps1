powershell -Command @"
Write-Host "`n================================`n`ue2 Task Assignment Test`n================================`n"

# Test 1: Create an order
Write-Host "1. Creating test order..."
try {
    \$orderData = @{
        customer = @{
            name = "John Doe"
            phone = "9999999999"
            address = "123 Test Street"
        }
        garmentType = "Saree"
        measurements = @{
            length = "5.5"
            width = "1.2"
        }
        pricing = @{
            total = 5000
            advance = 2000
            balance = 3000
        }
        deliveryDate = (Get-Date).AddDays(7).ToString('yyyy-MM-dd')
        workflow = @('measurements-design', 'dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver')
    } | ConvertTo-Json

    \$response = Invoke-WebRequest -Uri 'http://localhost:3000/api/orders' `
        -Method Post `
        -ContentType 'application/json' `
        -Body \$orderData `
        -UseBasicParsing

    if (\$response.StatusCode -eq 200) {
        \$order = \$response.Content | ConvertFrom-Json
        \$orderId = \$order.order.orderId
        \$taskCount = \$order.order.workflowTasks.Count
        \$assignedTo = \$order.order.workflowTasks[0].assignedToName
        Write-Host "✅ Order created: \$orderId"
        Write-Host "   Tasks: \$taskCount"
        Write-Host "   First task assigned to: \$assignedTo"
    }
} catch {
    Write-Host "❌ Error: \$_"
    exit 1
}

# Test 2: Fetch Rajesh's tasks
Write-Host "`n2. Fetching Rajesh's tasks..."
try {
    \$response = Invoke-WebRequest -Uri 'http://localhost:3000/api/staff/staff_001/tasks' `
        -Method Get `
        -UseBasicParsing

    if (\$response.StatusCode -eq 200) {
        \$tasks = \$response.Content | ConvertFrom-Json
        if (\$tasks -is [array]) {
            Write-Host "✅ Found \$(\$tasks.Count) tasks"
            if (\$tasks.Count -gt 0) {
                Write-Host "   First task: \$(\$tasks[0].orderId) - \$(\$tasks[0].stageName)"
            }
        } else {
            Write-Host "✅ Found 1 task"
            Write-Host "   Task: \$(\$tasks.orderId) - \$(\$tasks.stageName)"
        }
    }
} catch {
    Write-Host "❌ Error: \$_"
    exit 1
}

Write-Host "`n✨ All tests passed!`n"
"@
