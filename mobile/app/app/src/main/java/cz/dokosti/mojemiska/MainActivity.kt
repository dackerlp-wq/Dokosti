package cz.dokosti.mojemiska

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private val green = Color(0xFF2A382E)
private val cream = Color(0xFFF3ECDD)
private val brick = Color(0xFFC85A28)
private val muted = Color(0xFF55645A)
private val paper = Color(0xFFFBF7EE)
private const val api = "https://tpzeltvekvliqluhfrvn.supabase.co"
private const val publishable = "sb_publishable_ze8lLGxJM8e2b4IDgRti1w_PsIZhj8w"

private suspend fun request(path: String, method: String = "GET", token: String? = null, body: JSONObject? = null): String =
    withContext(Dispatchers.IO) {
        val connection = URL(api + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 12000
            connection.readTimeout = 18000
            connection.setRequestProperty("apikey", publishable)
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                connection.doOutput = true
                connection.outputStream.use { it.write(body.toString().toByteArray()) }
            }
            val status = connection.responseCode
            val result = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() } ?: ""
            if (status !in 200..299) {
                val description = try {
                    val json = JSONObject(result)
                    json.optString("msg").ifBlank { json.optString("message").ifBlank { json.optString("error_description") } }
                } catch (_: Exception) { "" }
                error(if (status == 401 || status == 403) "Přístup zamítnut. Přihlaste se znovu." else description.ifBlank { "HTTP $status" })
            }
            result
        } finally { connection.disconnect() }
    }

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary=green, secondary=brick, background=cream, surface=paper, onSurface=green)) {
                MojeMiska()
            }
        }
    }
}

@Composable
private fun MojeMiska() {
    var token by remember { mutableStateOf("") }
    var userEmail by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var sent by remember { mutableStateOf(false) }
    var usePassword by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var tab by remember { mutableIntStateOf(0) }
    var pets by remember { mutableStateOf(JSONArray()) }
    var orders by remember { mutableStateOf(JSONArray()) }
    var customer by remember { mutableStateOf(JSONObject()) }
    var items by remember { mutableStateOf(JSONArray()) }
    val scope = rememberCoroutineScope()

    fun loadAccount(t: String) {
        scope.launch {
            loading = true
            try {
                pets = JSONArray(request("/rest/v1/pets?select=id,name,species,weight_kg&order=updated_at.desc&limit=20", token=t))
                orders = JSONArray(request("/rest/v1/orders?select=id,order_number,status,total_czk,created_at&order=created_at.desc&limit=30", token=t))
                val customers = JSONArray(request("/rest/v1/customers?select=id,name,points&limit=1", token=t))
                customer = if (customers.length() > 0) customers.getJSONObject(0) else JSONObject()
                items = JSONArray(request("/rest/v1/products?select=slug,variant,price_czk,stock_qty,in_stock,is_complete&is_published=eq.true&limit=20", token=t))
                message = ""
            } catch (e: Exception) {
                message = "Nelze načíst data: ${e.message}"
            } finally { loading = false }
        }
    }

    fun login(mode: String) {
        scope.launch {
            loading = true
            message = ""
            try {
                val response = when (mode) {
                    "password" -> request("/auth/v1/token?grant_type=password", "POST", body=JSONObject().put("email",email.trim()).put("password",pass))
                    "verify" -> request("/auth/v1/verify", "POST", body=JSONObject().put("email",email.trim()).put("token",otp.trim()).put("type","email"))
                    else -> request("/auth/v1/otp", "POST", body=JSONObject().put("email",email.trim()).put("create_user",false))
                }
                if (mode == "send") { sent = true; message = "Zkontrolujte e-mail a zadejte osmimístný kód." }
                else {
                    val payload = JSONObject(response)
                    token = payload.getString("access_token")
                    userEmail = payload.optJSONObject("user")?.optString("email") ?: email
                    loadAccount(token)
                }
            } catch (e: Exception) { message = e.message ?: "Přihlášení selhalo." }
            finally { loading = false }
        }
    }

    Column(Modifier.fillMaxSize().background(cream)) {
        Column(Modifier.fillMaxWidth().background(green).padding(horizontal=20.dp, vertical=18.dp)) {
            Text("MOJE MISKA", color=Color(0xFFF3ECDD), fontSize=13.sp, fontWeight=FontWeight.ExtraBold, letterSpacing=2.sp)
            Text("by DoKosti", color=Color(0xFFD9CFB8), fontSize=13.sp)
        }
        if (token.isBlank()) {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(22.dp), verticalArrangement=Arrangement.spacedBy(14.dp)) {
                Text("Vítejte zpátky", fontSize=29.sp, fontWeight=FontWeight.Bold, color=green)
                Text("Přihlaste se stejným účtem jako na dokosti.cz.", color=muted)
                OutlinedTextField(email, { email = it; sent=false }, label={Text("E-mail")}, singleLine=true, modifier=Modifier.fillMaxWidth(),
                    keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Email))
                if (usePassword) {
                    OutlinedTextField(pass, {pass=it}, label={Text("Heslo")}, modifier=Modifier.fillMaxWidth(), singleLine=true,
                        visualTransformation=PasswordVisualTransformation())
                    Button(onClick={login("password")}, enabled=!loading && email.contains("@") && pass.isNotBlank(), modifier=Modifier.fillMaxWidth()) { Text("Přihlásit se") }
                } else {
                    if (sent) {
                        OutlinedTextField(otp, {otp=it.filter(Char::isDigit).take(8)}, label={Text("Osmimístný kód z e-mailu")}, singleLine=true, modifier=Modifier.fillMaxWidth(),
                            keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Number))
                        Button(onClick={login("verify")}, enabled=!loading && otp.length==8, modifier=Modifier.fillMaxWidth()) { Text("Ověřit kód") }
                    }
                    OutlinedButton(onClick={login("send")}, enabled=!loading && email.contains("@"), modifier=Modifier.fillMaxWidth()) {
                        Text(if (sent) "Poslat nový kód" else "Poslat přihlašovací kód")
                    }
                }
                TextButton(onClick={usePassword=!usePassword}) { Text(if(usePassword) "Použít kód z e-mailu" else "Přihlásit se heslem") }
                if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
                if (message.isNotBlank()) Text(message, color=brick)
                Text("Testovací nativní Android aplikace. Účet a data jsou ze skutečného DoKosti; nákupy se zde neprovádějí.",color=muted,fontSize=12.sp)
            }
        } else {
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(18.dp), verticalArrangement=Arrangement.spacedBy(12.dp)) {
                if (loading) LinearProgressIndicator(Modifier.fillMaxWidth())
                if (message.isNotBlank()) Text(message,color=brick,fontSize=13.sp)
                when(tab) {
                    0 -> {
                        Text("Ahoj, parťáku!", fontSize=26.sp, fontWeight=FontWeight.Bold, color=green)
                        Text(userEmail, color=muted, fontSize=13.sp)
                        InfoCard("Můj mazlíček", if(pets.length()>0) pets.getJSONObject(0).optString("name") else "Přidejte svého psa či kočku na dokosti.cz")
                        InfoCard("Věrnostní Kostičky", customer.optInt("points",0).toString())
                        InfoCard("Poslední objednávka", if(orders.length()>0) orders.getJSONObject(0).optString("order_number") else "Zatím žádná objednávka")
                        InfoCard("Péče a připomínky", "Kalendář a termíny očkování připravujeme.")
                    }
                    1 -> {
                        Text("Moje krmení", fontSize=25.sp, fontWeight=FontWeight.Bold)
                        Text("Produkty, objednávky a bezpečné opakování nákupu.", color=muted)
                        if (orders.length()==0) Text("Žádná objednávka k zopakování.")
                        for (i in 0 until orders.length()) {
                            val o=orders.getJSONObject(i)
                            InfoCard(o.optString("order_number"), "${o.optInt("total_czk")} Kč · ${o.optString("status")}")
                        }
                        Text("Aktuální produkty",fontWeight=FontWeight.Bold)
                        for (i in 0 until minOf(items.length(), 12)) {
                            val p=items.getJSONObject(i)
                            val available=p.optBoolean("in_stock")
                            InfoCard(p.optString("variant").ifBlank { p.optString("slug") },
                                "${p.optInt("price_czk")} Kč · ${if(available) "Skladem dle katalogu" else "Není skladem"}")
                        }
                        Text("Opakování nákupu bude vyžadovat novou kontrolu skladu a výslovné potvrzení. Testovací verze nevytváří objednávku.",color=muted,fontSize=12.sp)
                    }
                    2 -> {
                        Text("Moji mazlíčci",fontSize=25.sp,fontWeight=FontWeight.Bold)
                        if (pets.length()==0) Text("Zatím nemáte uložený profil. Můžete jej vytvořit na dokosti.cz.")
                        for (i in 0 until pets.length()) {
                            val p=pets.getJSONObject(i)
                            InfoCard(p.optString("name"), "${p.optString("species")} · ${p.optString("weight_kg").takeUnless { it=="null" } ?: "Hmotnost nezadaná"} kg")
                        }
                        InfoCard("Kalendář péče", "Připomínky očkování a odčervení budou přidané v další verzi.")
                    }
                    3 -> {
                        Text("V mém okolí",fontSize=25.sp,fontWeight=FontWeight.Bold)
                        InfoCard("Hlídání a venčení", "Katalog místních služeb bude propojen po ověření poskytovatelů.")
                        InfoCard("Veterináři", "Kontakty a ordinační doby bez neověřených údajů.")
                        InfoCard("Výcvik a salony", "Připravujeme přehled služeb.")
                    }
                    else -> {
                        Text("Můj profil",fontSize=25.sp,fontWeight=FontWeight.Bold)
                        InfoCard("Přihlášený účet", userEmail)
                        InfoCard("Kostičky", customer.optInt("points",0).toString())
                        OutlinedButton(onClick={loadAccount(token)}, modifier=Modifier.fillMaxWidth()) { Text("Obnovit údaje") }
                        OutlinedButton(onClick={token="";userEmail="";pets=JSONArray();orders=JSONArray();items=JSONArray()},modifier=Modifier.fillMaxWidth()) { Text("Odhlásit se") }
                    }
                }
            }
            NavigationBar(containerColor=paper) {
                listOf("Domů","Krmení","Péče","V okolí","Profil").forEachIndexed { index, name ->
                    NavigationBarItem(selected=tab==index, onClick={tab=index}, icon={ Text(listOf("⌂","▣","♡","⌾","●")[index]) },label={Text(name,fontSize=10.sp)})
                }
            }
        }
    }
}

@Composable
private fun InfoCard(title:String,subtitle:String) {
    Card(modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(18.dp),
        colors=CardDefaults.cardColors(containerColor=paper)) {
        Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(7.dp)) {
            Text(title, fontSize=18.sp, fontWeight=FontWeight.SemiBold, color=green)
            Text(subtitle, fontSize=14.sp, color=muted)
        }
    }
}
